const CONFIG = {
  SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
  SHEET_NAME: '交通費申請',
  STAFF_SHEET_NAME: '従業員名簿',
  TIMEZONE: 'Asia/Tokyo'
};

const HEADERS = [
  '申請番号','登録キー','ステータス','申請者区分','申請日','出張日','事業部','店・部門','係コード','係名','申請者名',
  '出張先','目的','乗車地','経由地','降車地','利用種別','IC運賃合計','申請区分','申請額','備考','区間詳細(JSON)',
  '承認者氏名','承認ステータス','承認トークン','承認日時','登録日時','UserAgent'
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === 'approve' && params.token) {
    return handleApproval_(params.token);
  }
  if (params.action === 'staffDirectory') {
    return jsonResponse_({ ok: true, staff: getStaffDirectoryPublic_() });
  }
  return jsonResponse_({ ok: true, service: 'travel-expense-api' });
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (request.action !== 'submitTravelExpense') return jsonResponse_({ ok: false, message: '不明な処理です。' });
    const data = request.payload || {};
    if (String(data.website || '').trim()) return jsonResponse_({ ok: true, applicationId: 'RECEIVED' });
    const result = saveTravelExpense_(data);
    return jsonResponse_({ ok: true, applicationId: result.applicationId, duplicate: result.duplicate });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, message: error.message || '保存処理でエラーが発生しました。' });
  }
}

function saveTravelExpense_(data) {
  validate_(data);
  const sheet = getOrCreateSheetWithHeader_(getSpreadsheet_(), CONFIG.SHEET_NAME, HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const duplicate = findByClientToken_(sheet, data.clientToken);
    if (duplicate) return { applicationId: duplicate, duplicate: true };

    const applicationId = generateApplicationId_();
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const hasApprover = String(data.approverName || '').trim();
    const approvalToken = hasApprover ? Utilities.getUuid() : '';

    const row = {
      '申請番号': applicationId, '登録キー': data.clientToken, 'ステータス': '申請済み', '申請者区分': data.employeeType,
      '申請日': data.applicationDate, '出張日': data.travelDate, '事業部': data.division, '店・部門': data.store, '係コード': data.sectionCode,
      '係名': data.sectionName, '申請者名': data.applicantName, '出張先': data.businessDestination, '目的': data.purpose,
      '乗車地': data.origin, '経由地': data.viaStations, '降車地': data.destinationStation, '利用種別': data.transportType,
      'IC運賃合計': Number(data.icFare || 0),
      '申請区分': data.tripType, '申請額': Number(data.claimedAmount || 0), '備考': data.remarks || '',
      '区間詳細(JSON)': JSON.stringify(data.segments || []),
      '承認者氏名': data.approverName || '', '承認ステータス': hasApprover ? '承認待ち' : '対象外（紙運用）',
      '承認トークン': approvalToken, '承認日時': '',
      '登録日時': now, 'UserAgent': data.userAgent || ''
    };
    sheet.appendRow(HEADERS.map(header => row[header] ?? ''));

    if (hasApprover) {
      sendApprovalRequestEmail_(applicationId, data, approvalToken);
    }

    return { applicationId, duplicate: false };
  } finally {
    lock.releaseLock();
  }
}

const ALLOWED_TRANSPORT_TYPES = ['鉄道', 'バス', '鉄道・バス', 'その他'];

function validate_(data) {
  const required = ['clientToken','employeeType','applicationDate','travelDate','division','store','sectionCode','sectionName','applicantName','businessDestination','purpose','origin','viaStations','destinationStation','transportType'];
  const missing = required.filter(key => !String(data[key] || '').trim());
  if (missing.length) throw new Error(`必須項目が不足しています：${missing.join(', ')}`);
  if (!['従業員','定時従業員','アルバイト'].includes(data.employeeType)) throw new Error('申請者区分が不正です。');

  // 利用種別は区間ごとに複数種類が混在しうる（例：「鉄道・バス・その他」）ため、
  // 「・」区切りの各要素が許容リストに含まれているかで判定する。
  const transportParts = String(data.transportType || '').split('・').filter(Boolean);
  if (!transportParts.length || !transportParts.every(part => ALLOWED_TRANSPORT_TYPES.includes(part))) {
    throw new Error('利用種別が不正です。');
  }

  if (!Array.isArray(data.segments) || !data.segments.length) throw new Error('移動区間が1件も入力されていません。');
  if (data.segments.length > 10) throw new Error('移動区間は最大10件までです。');
  data.segments.forEach((segment, i) => {
    const segMissing = ['origin', 'destination', 'transportType'].filter(key => !String(segment[key] || '').trim());
    if (segMissing.length) throw new Error(`区間${i + 1}：必須項目が不足しています（${segMissing.join('、')}）。`);
    if (!(Number(segment.icFare) >= 0)) throw new Error(`区間${i + 1}：IC運賃が不正です。`);
  });

  if (!(Number(data.icFare) >= 0)) throw new Error('IC運賃合計が不正です。');
  if (!(Number(data.claimedAmount) >= 0)) throw new Error('申請額が不正です。');

  if (String(data.approverName || '').trim()) {
    const staff = getStaffDirectory_();
    const approver = findStaffByName_(staff, data.approverName);
    if (!approver) throw new Error('選択された承認者が名簿に見つかりません。');
    const applicant = findStaffByName_(staff, data.applicantStaffName || data.applicantName);
    // 申請者が名簿にいない（アルバイト等）場合はランク比較のしようがないため、承認者の存在確認のみで通す。
    if (applicant && approver.rank < applicant.rank) {
      throw new Error('承認者は申請者と同格以上の役職者を選んでください。');
    }
  }
}

function getSpreadsheet_() {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.includes('PASTE_')) throw new Error('GASのCONFIG.SPREADSHEET_IDを設定してください。');
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getOrCreateSheetWithHeader_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findByClientToken_(sheet, token) {
  if (!token || sheet.getLastRow() < 2) return '';
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const tokenCol = header.indexOf('登録キー') + 1;
  const idCol = header.indexOf('申請番号') + 1;
  if (!tokenCol || !idCol) return '';
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const found = rows.find(row => String(row[tokenCol - 1]) === String(token));
  return found ? String(found[idCol - 1]) : '';
}

function generateApplicationId_() {
  const props = PropertiesService.getScriptProperties();
  const yearMonth = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMM');
  const key = `travelExpenseCounter_${yearMonth}`;
  const counter = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(counter));
  return `TR-${yearMonth}-${String(counter).padStart(4, '0')}`;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   従業員名簿（承認者マスタを兼ねる）
   シート列：氏名 / 姓 / 部課名 / 役職 / ランク / メールアドレス
   ============================================================ */

function getStaffDirectory_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.STAFF_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  return values
    .filter(row => String(row[0] || '').trim())
    .map(row => ({
      name: String(row[0]).trim(),
      surname: String(row[1]).trim(),
      department: String(row[2]).trim(),
      title: String(row[3]).trim(),
      rank: Number(row[4]) || 0,
      email: String(row[5]).trim()
    }));
}

function findStaffByName_(staff, name) {
  const target = String(name || '').trim();
  if (!target) return null;
  return staff.find(s => s.name === target) || null;
}

// フロント（ブラウザ）へ返す名簿は、メールアドレスを含めない。
// 承認メールの送信先解決はGAS側（サーバー）でのみ行い、クライアントにメールアドレスを渡さない。
function getStaffDirectoryPublic_() {
  return getStaffDirectory_().map(s => ({
    name: s.name, department: s.department, title: s.title, rank: s.rank
  }));
}

// 姓の解決：名簿にヒットすればその「姓」カラムを使う。ヒットしない場合（アルバイト等、
// 名簿に載っていない申請者）は、氏名をスペースで区切った先頭部分を姓とみなす。
function resolveSurname_(staff, fullName) {
  const found = findStaffByName_(staff, fullName);
  if (found && found.surname) return found.surname;
  const trimmed = String(fullName || '').trim();
  return trimmed.split(/[ 　]+/)[0] || trimmed;
}

/* ============================================================
   承認メール送信・承認処理
   ============================================================ */

function sendApprovalRequestEmail_(applicationId, data, token) {
  const staff = getStaffDirectory_();
  const approver = findStaffByName_(staff, data.approverName);
  if (!approver || !approver.email) return; // メールアドレス未登録の場合は何もしない（申請自体は成立させる）

  const approveUrl = `${ScriptApp.getService().getUrl()}?action=approve&token=${encodeURIComponent(token)}`;
  const printHtml = buildPrintHtml_(data, applicationId, { applicantSeal: false, approverSeal: false });
  const pdfBlob = htmlToPdfBlob_(printHtml, `${applicationId}.pdf`);

  const body = [
    `${data.applicantName} さんから交通費申請の承認依頼が届いています。`,
    '',
    `申請番号：${applicationId}`,
    `出張日：${data.travelDate}　出張先：${data.businessDestination}`,
    `目的：${data.purpose}`,
    `申請額：${Number(data.claimedAmount || 0).toLocaleString()}円`,
    '',
    '内容は添付のPDFをご確認ください。',
    '承認する場合は、以下のリンクをクリックしてください（クリックした時点で承認が確定します）。',
    approveUrl,
    '',
    '※このメールに心当たりがない場合は、破棄してください。'
  ].join('\n');

  MailApp.sendEmail({
    to: approver.email,
    subject: `【承認依頼】交通費申請（${data.applicantName}／${applicationId}）`,
    body,
    attachments: [pdfBlob]
  });
}

function handleApproval_(token) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return htmlResponse_('対象の申請が見つかりませんでした。');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const col = name => header.indexOf(name) + 1;
    const tokenCol = col('承認トークン');
    if (!tokenCol) return htmlResponse_('承認処理でエラーが発生しました（列が見つかりません）。');

    const lastRow = sheet.getLastRow();
    const tokenValues = sheet.getRange(2, tokenCol, lastRow - 1, 1).getValues();
    const rowIndex = tokenValues.findIndex(r => String(r[0]) === String(token));
    if (rowIndex === -1) return htmlResponse_('この承認リンクは無効です。すでに処理済みか、URLが正しくない可能性があります。');

    const sheetRow = rowIndex + 2;
    const rowValues = sheet.getRange(sheetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const get = name => rowValues[col(name) - 1];

    if (get('承認ステータス') === '承認済み') {
      return htmlResponse_('この申請はすでに承認済みです。二重の承認操作は行われませんでした。');
    }

    // サーバー側でも、承認者が申請者以上のランクかを再検証する（UIの選択に頼らない）。
    const staff = getStaffDirectory_();
    const approver = findStaffByName_(staff, get('承認者氏名'));
    const applicant = findStaffByName_(staff, get('申請者名'));
    if (applicant && approver && approver.rank < applicant.rank) {
      return htmlResponse_('承認権限がありません（申請者より上位の役職者による承認が必要です）。');
    }

    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    sheet.getRange(sheetRow, col('承認ステータス')).setValue('承認済み');
    sheet.getRange(sheetRow, col('承認日時')).setValue(now);

    const data = rowToData_(header, rowValues);
    const applicationId = get('申請番号');
    const applicantSurname = resolveSurname_(staff, get('申請者名'));
    const approverSurname = resolveSurname_(staff, get('承認者氏名'));
    const finalHtml = buildPrintHtml_(data, applicationId, {
      applicantSeal: true, approverSeal: true,
      applicantSurname, approverSurname,
      approverName: get('承認者氏名'), approvedAt: now
    });
    const pdfBlob = htmlToPdfBlob_(finalHtml, `${applicationId}.pdf`);

    if (data.applicantEmail) {
      MailApp.sendEmail({
        to: data.applicantEmail,
        subject: `【承認完了】交通費申請（${applicationId}）`,
        body: [
          `${get('承認者氏名')} さんが交通費申請（${applicationId}）を承認しました。`,
          '',
          '添付の押印済みPDFを、庶務への提出に使用してください。'
        ].join('\n'),
        attachments: [pdfBlob]
      });
    }

    return htmlResponse_(`承認しました。${get('申請者名')} さんへ、押印済みのPDFを送信しました。`);
  } catch (error) {
    console.error(error);
    return htmlResponse_('承認処理中にエラーが発生しました。時間をおいて再度お試しください。');
  } finally {
    lock.releaseLock();
  }
}

// Spreadsheetの1行（ヘッダー名→値）を、PDF生成関数が期待する形へ最低限だけ復元する。
// 区間詳細は保存時のJSONから復元し、申請者のメールは名簿から引く。
function rowToData_(header, rowValues) {
  const get = name => rowValues[header.indexOf(name)];
  const staff = getStaffDirectory_();
  const applicant = findStaffByName_(staff, get('申請者名'));
  return {
    applicantName: get('申請者名'),
    applicantEmail: applicant ? applicant.email : '',
    division: get('事業部'), store: get('店・部門'), sectionName: get('係名'), sectionCode: get('係コード'),
    employeeType: get('申請者区分'),
    travelDate: get('出張日'), businessDestination: get('出張先'), purpose: get('目的'),
    remarks: get('備考'),
    icFare: Number(get('IC運賃合計') || 0), claimedAmount: Number(get('申請額') || 0),
    segments: JSON.parse(get('区間詳細(JSON)') || '[]'),
    applicationDate: get('申請日')
  };
}

function htmlResponse_(message) {
  return HtmlService.createHtmlOutput(
    `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
      <p style="font-size:16px;">${escapeHtmlGas_(message)}</p>
    </body></html>`
  );
}

/* ============================================================
   印刷用HTML／PDF生成（フロント側 app.js の buildPrintArea と同じ内容をGAS側でも再現する）
   ============================================================ */

function sealHtml_(surname) {
  if (!surname) return '';
  return `<span style="display:inline-block;border:1.5px solid #000;border-radius:50%;padding:2px 8px;font-weight:bold;">${escapeHtmlGas_(surname)}</span>`;
}

function buildPrintHtml_(data, applicationId, options) {
  const opts = options || {};
  const routeLines = (data.segments || []).map(s => `${s.origin}～${s.destination}${s.routeLine ? `（${s.routeLine}）` : ''}`);
  const rowCount = Math.max(4, Math.ceil(routeLines.length / 2));
  const leftLines = routeLines.slice(0, rowCount);
  const rightLines = routeLines.slice(rowCount);

  // canvasが使えないGAS環境向けに、白伝テンプレートと同じ「全角2・半角1」換算で
  // セル幅に収まる最大のフォントサイズを選ぶ（行の高さを文字量で変えないため）。
  const ROUTE_CELL_WIDTH_UNITS = 46;
  const FONT_TIERS = [12, 11, 10, 9, 8, 7];
  function charWidthUnits(s) {
    let w = 0;
    for (const ch of String(s)) w += ch.codePointAt(0) > 0x7F ? 2 : 1;
    return w;
  }
  function fitRouteCell(text) {
    if (!text) return '';
    const units = charWidthUnits(text);
    let size = FONT_TIERS[FONT_TIERS.length - 1];
    for (const tier of FONT_TIERS) {
      // フォントサイズが小さいほど、同じセル幅に入る文字数（units）は増える近似
      const capacity = ROUTE_CELL_WIDTH_UNITS * (12 / tier);
      if (units <= capacity) { size = tier; break; }
    }
    return `<span style="font-size:${size}px;">${escapeHtmlGas_(text)}</span>`;
  }

  const routeRows = Array.from({ length: rowCount }, (_, i) => `
    <tr>
      <td style="border:1px solid #333;padding:0 8px;font-size:12px;height:24px;line-height:24px;white-space:nowrap;overflow:hidden;">${fitRouteCell(leftLines[i])}</td>
      <td style="border:1px solid #333;padding:0 8px;font-size:12px;height:24px;line-height:24px;white-space:nowrap;overflow:hidden;">${fitRouteCell(rightLines[i])}</td>
    </tr>
  `).join('');

  const applicantSealCell = opts.applicantSeal ? sealHtml_(opts.applicantSurname || '') : '';
  const approverSealCell = opts.approverSeal ? sealHtml_(opts.approverSurname || '') : '';

  return `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="font-family:sans-serif;color:#000;">
    <div style="max-width:720px;margin:0 auto;padding:12mm;">
      <div style="text-align:center;position:relative;margin-bottom:10px;">
        <h1 style="font-size:22px;letter-spacing:10px;">交通費申請書</h1>
        <div style="position:absolute;right:0;bottom:2px;font-size:13px;">${escapeHtmlGas_(data.applicationDate || '')}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;font-weight:bold;background:#F7F7F7;width:80px;">出張日</td>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;">${escapeHtmlGas_(data.travelDate)}</td>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;font-weight:bold;background:#F7F7F7;width:80px;">出張先</td>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;">${escapeHtmlGas_(data.businessDestination)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;font-weight:bold;background:#F7F7F7;">目　的</td>
          <td colspan="3" style="border:1px solid #333;padding:6px 8px;font-size:13px;">${escapeHtmlGas_(data.purpose)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #333;padding:6px 8px;font-size:13px;font-weight:bold;background:#F7F7F7;">内　容</td>
          <td colspan="3" style="border:1px solid #333;padding:6px 8px;font-size:13px;">${escapeHtmlGas_(data.remarks || '')}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:-1px;table-layout:fixed;">${routeRows}</table>
      <table style="width:100%;border-collapse:collapse;margin-top:-1px;">
        <tr>
          <td style="border:1px solid #333;padding:8px;text-align:center;font-size:11px;width:18%;vertical-align:top;">認印<div style="height:34px;"></div>${applicantSealCell}</td>
          <td style="border:1px solid #333;padding:8px;text-align:center;font-size:11px;width:18%;vertical-align:top;">経理<div style="height:34px;"></div></td>
          <td style="border:1px solid #333;padding:8px;text-align:center;font-size:11px;width:18%;vertical-align:top;">所属上長<div style="height:34px;"></div>${approverSealCell}</td>
          <td style="border:1px solid #333;padding:8px;font-size:12px;font-weight:bold;width:46%;vertical-align:top;">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding-bottom:2px;margin-bottom:2px;"><span>運賃計</span><span>${Number(data.icFare || 0).toLocaleString()}円</span></div>
            <div style="display:flex;justify-content:space-between;"><span>合　計</span><span>${Number(data.claimedAmount || 0).toLocaleString()}円</span></div>
          </td>
        </tr>
      </table>
      <p style="margin-top:16px;font-size:13px;">上記の金額を請求致します${applicationId ? `（受付番号　${escapeHtmlGas_(applicationId)}）` : ''}</p>
      ${opts.approverName ? `<p style="font-size:12px;color:#555;">承認者：${escapeHtmlGas_(opts.approverName)}　承認日時：${escapeHtmlGas_(opts.approvedAt || '')}</p>` : ''}
    </div>
  </body></html>`;
}

function htmlToPdfBlob_(html, filename) {
  return Utilities.newBlob(html, 'text/html', filename).getAs('application/pdf');
}

function escapeHtmlGas_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
