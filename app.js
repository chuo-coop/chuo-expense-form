(() => {
  'use strict';

  const ORGANIZATION_MASTER = [{"code":"001100","section":"書籍","division":"多摩店舗事業部","store":"物販店"},{"code":"001200","section":"外売","division":"多摩店舗事業部","store":"物販店"},{"code":"001400","section":"図書館","division":"多摩店舗事業部","store":"物販店"},{"code":"001900","section":"市ヶ谷田町","division":"都心店舗事業部","store":"都心店舗"},{"code":"002200","section":"購買","division":"多摩店舗事業部","store":"物販店"},{"code":"002300","section":"私厚連運営","division":"総務部","store":"情報通信"},{"code":"002500","section":"派遣","division":"多摩店舗事業部","store":"物販店"},{"code":"002900","section":"店舗管理","division":"多摩店舗事業部","store":"物販店"},{"code":"003110","section":"軽食","division":"食堂事業部","store":"多摩食堂"},{"code":"003210","section":"1階食堂","division":"食堂事業部","store":"多摩食堂"},{"code":"003220","section":"2階食堂","division":"食堂事業部","store":"多摩食堂"},{"code":"003230","section":"和おん","division":"食堂事業部","store":"多摩食堂"},{"code":"003240","section":"日和","division":"食堂事業部","store":"多摩食堂"},{"code":"003290","section":"調理","division":"食堂事業部","store":"多摩食堂"},{"code":"003310","section":"喫茶","division":"食堂事業部","store":"多摩食堂"},{"code":"003330","section":"四季","division":"食堂事業部","store":"多摩食堂"},{"code":"003400","section":"杉並高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003500","section":"附属高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003510","section":"附属中学食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003600","section":"理工 3号館食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003700","section":"理工 5号館食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003800","section":"横浜中学高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003900","section":"食堂管理","division":"食堂事業部","store":"食堂管理"},{"code":"004000","section":"教育","division":"多摩店舗事業部","store":"サービス店"},{"code":"004100","section":"旅行国内","division":"多摩店舗事業部","store":"サービス店"},{"code":"004150","section":"旅行海外","division":"多摩店舗事業部","store":"サービス店"},{"code":"004200","section":"印刷","division":"多摩店舗事業部","store":"サービス店"},{"code":"004300","section":"通販","division":"多摩店舗事業部","store":"サービス店"},{"code":"004400","section":"理工","division":"都心店舗事業部","store":"理工店"},{"code":"004500","section":"杉並高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004600","section":"附属中学高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004700","section":"不動産","division":"不動産事業部","store":"不動産"},{"code":"004800","section":"横浜中学高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004900","section":"茗荷谷","division":"都心店舗事業部","store":"茗荷谷店"},{"code":"005100","section":"検収","division":"多摩店舗事業部","store":"物販店"},{"code":"005200","section":"情報通信","division":"総務部","store":"情報通信"},{"code":"005300","section":"庶務","division":"総務部","store":"総務"},{"code":"005400","section":"経理","division":"総務部","store":"総務"},{"code":"005500","section":"本部","division":"総務部","store":"総務"},{"code":"005600","section":"機関運営","division":"総務部","store":"総務"},{"code":"005700","section":"共済","division":"総務部","store":"共済"},{"code":"005800","section":"衛生管理","division":"総務部","store":"総務"},{"code":"005910","section":"学園中央開発","division":"不動産事業部","store":"不動産"},{"code":"005920","section":"学園中央開発","division":"不動産事業部","store":"施設管理"},{"code":"005930","section":"学園中央開発施設管理","division":"不動産事業部","store":"施設管理"},{"code":"006000","section":"新入生対応","division":"多摩店舗事業部","store":"情報通信"}];

  // 事業部の表示順は五十音順ではなく、指定の並び順（多摩→都心→食堂→不動産→総務）に固定する。
  const DIVISION_ORDER = ['多摩', '都心', '食堂', '不動産', '総務'];

  const $ = id => document.getElementById(id);
  const form = $('expenseForm');
  const previewDialog = $('previewDialog');
  const completeDialog = $('completeDialog');
  const saveState = $('saveState');
  const submitButton = $('submitFromPreviewButton');
  const MAX_SEGMENTS = 6; // B5固定の印刷枠に収まる現実的な上限として、10から見直した
  let clientToken = '';
  let segmentSeq = 0;
  let staffDirectory = [];

  init();

  async function init() {
    populateDivisions();
    const today = new Date().toISOString().slice(0, 10);
    $('applicationDate').value ||= today;
    restoreApplicant();
    updateApplicantNameAvailability();
    addSegment(); // 初期表示は1区間
    bindEvents();
    calculateAmount();

    staffDirectory = await fetchStaffDirectory();
    populateStaffNameList();
    updateApplicantNameAvailability();
    updateApplicantStaffHint();
    populateApproverOptions();
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
  }

  // 事業部の表示順は五十音順ではなく、指定の並び順（多摩→都心→食堂→不動産→総務）に固定する。
  function sortDivisions(values) {
    const unique = [...new Set(values.filter(Boolean))];
    return unique.sort((a, b) => {
      const ai = DIVISION_ORDER.findIndex(key => a.includes(key));
      const bi = DIVISION_ORDER.findIndex(key => b.includes(key));
      if (ai === -1 && bi === -1) return a.localeCompare(b, 'ja');
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  function setSelectOptions(select, placeholder, values) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function populateDivisions() {
    setSelectOptions($('division'), '選択してください', sortDivisions(ORGANIZATION_MASTER.map(row => row.division)));
    populateStores();
  }

  function populateStores(selectedStore = '') {
    const division = $('division').value;
    const store = $('store');
    const stores = uniqueSorted(ORGANIZATION_MASTER.filter(row => row.division === division).map(row => row.store));
    setSelectOptions(store, division ? '選択してください' : '事業部を選択してください', stores);
    store.disabled = !division;
    if (selectedStore && stores.includes(selectedStore)) store.value = selectedStore;
    populateSections();
  }

  function populateSections(selectedCode = '') {
    const division = $('division').value;
    const store = $('store').value;
    const select = $('sectionCode');
    select.innerHTML = `<option value="">${store ? '選択してください' : '店・部門を選択してください'}</option>`;
    const rows = ORGANIZATION_MASTER.filter(row => row.division === division && row.store === store);
    rows.forEach(row => {
      const option = document.createElement('option');
      option.value = row.code;
      option.textContent = `${row.code.slice(2)}　${row.section}`;
      option.dataset.name = row.section;
      select.append(option);
    });
    select.disabled = !store;
    if (selectedCode && rows.some(row => row.code === selectedCode)) select.value = selectedCode;
    updateSectionNote();
  }

  function restoreApplicant() {
    try {
      const saved = JSON.parse(localStorage.getItem('travelExpense.applicant') || '{}');
      if (saved.employeeType) {
        const radio = document.querySelector(`input[name="employeeType"][value="${CSS.escape(saved.employeeType)}"]`);
        if (radio) radio.checked = true;
      }
      $('division').value = saved.division || '';
      populateStores(saved.store || '');
      populateSections(saved.sectionCode || '');
      // 申請者名は復元しない：共有端末で複数人が使い回す運用のため、
      // 前回の人の名前が残ったまま次の人が誤って送信する事故を避ける。
    } catch (_) {
      // 保存値が壊れていても申請画面は継続する。
    }
  }

  function saveApplicant(data) {
    localStorage.setItem('travelExpense.applicant', JSON.stringify({
      employeeType: data.employeeType,
      division: data.division,
      store: data.store,
      sectionCode: data.sectionCode,
      applicantName: data.applicantName
    }));
  }

  function bindEvents() {
    $('division').addEventListener('change', () => { populateStores(); populateStaffNameList(); updateApplicantNameAvailability(); });
    $('store').addEventListener('change', () => { populateSections(); populateStaffNameList(); updateApplicantNameAvailability(); });
    $('sectionCode').addEventListener('change', updateSectionNote);
    $('addSegmentButton').addEventListener('click', () => addSegment());
    document.querySelectorAll('input[name="purposeCategory"]').forEach(el => el.addEventListener('change', updatePurposeOtherVisibility));
    $('applicantName').addEventListener('input', updateApplicantStaffHint);
    document.querySelectorAll('input[name="employeeType"]').forEach(el => el.addEventListener('change', () => { updateApplicantNameAvailability(); updateApplicantStaffHint(); }));
    document.querySelectorAll('input[name="tripType"]').forEach(el => el.addEventListener('change', calculateAmount));

    $('previewButton').addEventListener('click', () => {
      if (!form.reportValidity()) return;
      buildPreview(formDataObject());
      previewDialog.showModal();
    });
    $('closePreview').addEventListener('click', () => previewDialog.close());
    $('closePreviewBottom').addEventListener('click', () => previewDialog.close());
    $('submitFromPreviewButton').addEventListener('click', () => {
      // 確認画面をすぐ閉じると、送信完了までの間（フォールバック時は最大15秒程度）
      // 画面に何も表示されず不安にさせてしまうため、閉じずに処理中表示を出したままにする。
      form.requestSubmit(); // 通常の「申請する」ボタンと同じsubmitイベントを発火させる
    });
    $('printCompleteButton').addEventListener('click', () => openPrintDialog(lastSubmittedData || formDataObject(), lastApplicationId));
    $('closePrintDialog').addEventListener('click', () => $('printDialog').close());
    $('closePrintDialogBottom').addEventListener('click', () => $('printDialog').close());
    $('doPrintButton').addEventListener('click', () => {
      $('printDialog').close();
      printData(pendingPrintContext.data, pendingPrintContext.applicationId, $('showApplicantSealCheck').checked);
    });
    $('closeComplete').addEventListener('click', closeComplete);
    $('openApprovalDialogButton').addEventListener('click', () => {
      $('approvalApplicationId').value = '';
      $('approvalOtp').value = '';
      $('approvalErrorMessage').hidden = true;
      $('approvalSuccessMessage').hidden = true;
      $('approvalProcessingMessage').hidden = true;
      $('confirmApprovalButton').disabled = false;
      $('approvalDialog').showModal();
    });
    $('closeApprovalDialog').addEventListener('click', () => $('approvalDialog').close());
    $('confirmApprovalButton').addEventListener('click', handleConfirmApproval);
    $('routeHelpButton').addEventListener('click', () => $('routeHelpDialog').showModal());
    $('closeRouteHelp').addEventListener('click', () => $('routeHelpDialog').close());
    $('closeRouteHelpBottom').addEventListener('click', () => $('routeHelpDialog').close());
    form.addEventListener('submit', handleSubmit);
  }

  function updateSectionNote() {
    const option = $('sectionCode').selectedOptions[0];
    $('sectionCodeNote').textContent = option?.value
      ? `係コード：${option.value.slice(2)}（登録値：${option.value}）`
      : '係コードは選択内容から自動登録されます。';
  }

  function updatePurposeOtherVisibility() {
    const category = document.querySelector('input[name="purposeCategory"]:checked')?.value || '';
    const isOther = category === 'その他';
    $('purposeOtherWrap').hidden = !isOther;
    $('purposeOther').required = isOther;
    if (!isOther) $('purposeOther').value = '';
  }

  /* ============================================================
     従業員名簿（申請者名のオートコンプリート／承認者選択）
     名簿はGASから取得する（メールアドレスは含まれない）。
     ============================================================ */

  function populateStaffNameList() {
    const storeText = $('store').value;
    // 選択中の「店・部門」と名簿の「所属」がゆるく一致する人だけに絞る。
    // 該当者が1人もいない場合は絞り込まず全員を出す（表記のズレで候補が消えてしまうのを避けるため）。
    const filtered = storeText
      ? staffDirectory.filter(s => storeText.includes(s.affiliation) || (s.affiliation || '').includes(storeText))
      : staffDirectory;
    const list = filtered.length ? filtered : staffDirectory;
    $('staffNameList').innerHTML = list.map(s => `<option value="${escapeHtml(s.name)}"></option>`).join('');
  }

  // 従業員区分のときは、所属（店・部門）を選ぶまで申請者名欄を使わせない
  // （定時従業員・アルバイトはそもそも名簿に載っていない前提なので対象外）。
  function updateApplicantNameAvailability() {
    const employeeType = document.querySelector('input[name="employeeType"]:checked')?.value || '';
    const storeSelected = Boolean($('store').value);
    const shouldLock = employeeType === '従業員' && !storeSelected;

    $('applicantName').disabled = shouldLock;
    if (shouldLock) {
      $('applicantName').placeholder = '先に事業部・店を選択してください';
      $('applicantName').value = '';
    } else {
      $('applicantName').placeholder = '';
    }
  }

  function currentApplicantStaff() {
    const name = $('applicantName').value.trim();
    return staffDirectory.find(s => s.name === name) || null;
  }

  function updateApplicantStaffHint() {
    const staff = currentApplicantStaff();
    const employeeType = document.querySelector('input[name="employeeType"]:checked')?.value || '';
    const nameEntered = $('applicantName').value.trim();
    const mismatchWarning = employeeType === '従業員' && nameEntered && !staff && staffDirectory.length > 0;

    if (staff) {
      $('applicantStaffHint').textContent = `名簿に一致：${staff.affiliation || staff.department}（ランク${staff.rank}）`;
      $('applicantStaffHint').classList.remove('field-note--warning');
    } else if (mismatchWarning) {
      $('applicantStaffHint').textContent = '名簿と一致しません。承認者機能を使うには、名簿の表記（スペース等）に合わせて入力してください。';
      $('applicantStaffHint').classList.add('field-note--warning');
    } else {
      $('applicantStaffHint').textContent = '';
      $('applicantStaffHint').classList.remove('field-note--warning');
    }

    populateApproverOptions();
    $('approverSelect').disabled = mismatchWarning;
    if (mismatchWarning) $('approverSelect').value = '';
  }

  function populateApproverOptions() {
    const select = $('approverSelect');
    const currentValue = select.value;
    const applicantStaff = currentApplicantStaff();
    const minRank = applicantStaff ? applicantStaff.rank : 0;

    // 申請者と同格以上のランクだけを候補にする（サーバー側でも同じ条件を再検証している）。
    // 申請者が名簿にいない場合（アルバイト等）は、ランクで絞らず全員を候補にする。
    const candidates = staffDirectory
      .filter(s => s.rank >= minRank)
      .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, 'ja'));

    select.innerHTML = '<option value="">指定しない（対面で押印してもらう）</option>'
      + candidates.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.surname)}　${escapeHtml(s.affiliation || s.department)}</option>`).join('');

    if (candidates.some(s => s.name === currentValue)) select.value = currentValue;
  }

  /* ============================================================
     Yahoo!路線情報の貼り付けテキストを解析するモジュール群。
     責務ごとに5つに分離しているので、Yahoo!側の表示形式が変わったり
     新しい交通機関（フェリー・BRT等）に対応する場合も、影響範囲は
     基本的に SectionParser 内のキーワード追加だけで済む想定。

       YahooTextReader  … 貼り付けテキストを行単位に前処理
       SectionParser    … 行配列 → Section配列（鉄道/バス/飛行機/徒歩を問わず全区間）
       WalkResolver     … 徒歩区間を除去し、実際に運賃が発生した区間だけへ整理
       RouteNormalizer  … 乗車地・経由地・降車地・利用交通へ正規化
       ExpenseConverter … 上記を束ねてフォーム用の結果オブジェクトへ変換
     ============================================================ */

  const YahooTextReader = {
    toLines(text) {
      return String(text || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    },
    extractHeaderFare(text) {
      const m = String(text || '').match(/IC優先[：:]\s*([\d,]+)円/u);
      return m ? Number(m[1].replace(/,/g, '')) : null;
    }
  };

  const SectionParser = {
    // 駅名・地点名は「時刻表出口地図」「時刻表出口」「時刻表地図」「地図」のいずれかで終わる
    // 1行として貼り付けられる（駅名とマーカー文言の間にスペースは入らない）。
    MARKER_SUFFIX: /(時刻表出口地図|時刻表出口|時刻表地図|地図)$/u,

    isPlaceLine(line) {
      return this.MARKER_SUFFIX.test(line);
    },

    extractPlace(line) {
      return line
        .replace(/^\d{1,2}:\d{2}着\d{1,2}:\d{2}発\s*/u, '')
        .replace(/^\d{1,2}:\d{2}着\s*/u, '')
        .replace(/^\d{1,2}:\d{2}発\s*/u, '')
        .replace(/^発\s*/u, '')
        .replace(/^着\s*/u, '')
        .replace(this.MARKER_SUFFIX, '')
        .replace(/\/[^/]*バス$/u, '') // 「武蔵小金井駅/西武バス」のようなバス会社サフィックスを除去
        .trim();
    },

    isNoise(line) {
      return /^\[発\].*\[着\]/u.test(line)          // [発] 2番線 → [着] 4番線
        || /^乗車位置：/u.test(line)
        || /^\d+駅$/u.test(line)
        || /^[\d,]+円$/u.test(line)                 // 区間運賃（別途fareとして拾う）
        || /^\d{1,2}:\d{2}$/u.test(line)             // 単独の時刻表記
        || /(運転見合わせ|列車遅延|運転状況|運休|人身事故|信号確認|運行情報)/u.test(line) // 部分一致でも拾う（重複表示されることがあるため）
        || /^ルート\d+$/u.test(line)
        || /^(早|安|楽|早楽|安楽|ルート保存|定期券|ルート共有|印刷する|チケット予約|座席選択|きっぷ購入)$/u.test(line)
        || /^(指定席|自由席|グリーン車|普通車指定席|普通車自由席)[：:]/u.test(line) // 座席種別ごとの運賃内訳（別途fareとして拾う）
        || /発→.*着.*分/u.test(line);                // ヘッダーのサマリー行
    },

    // 同一内容の行が連続しているものは1行にまとめる（未知のUI表示要素が
    // 重複表示されるケースへの汎用対策。個別にノイズ登録していなくても軽減できる）。
    dedupeConsecutive(lines) {
      return lines.filter((line, i) => i === 0 || line !== lines[i - 1]);
    },

    isWalk(line) { return /徒歩/u.test(line); },

    classifyBlock(blockLines) {
      const content = this.dedupeConsecutive(blockLines.filter(l => !this.isNoise(l)));
      if (content.some(l => this.isWalk(l))) return { type: 'walk' };
      const fareLine = blockLines.find(l => /^[\d,]+円$/u.test(l));
      const fare = fareLine ? Number(fareLine.replace(/[^\d]/g, '')) : null;
      const joined = content.join('');
      let type = 'rail';
      if (/バス/u.test(joined)) type = 'bus';
      // 表示用の路線名は「〇〇行」（行き先）の行を除外し、先頭の「ＪＲ」表記も外す。
      // 例：「ＪＲ南武線」「川崎行」 → 「南武線」
      // 「急行」等は末尾が偶然「行」になるため、行き先とみなすのは"最後の行"だけに限定する。
      const lineName = (content.length > 1 && /行$/u.test(content[content.length - 1])
        ? content.slice(0, -1)
        : content
      ).map(l => {
        let cleaned = l
          .replace(/^(ＪＲ|JR)/u, '')
          // 新幹線の列車愛称＋号数（例：「こだま839号」）は路線名ではないので除く。
          .replace(/(のぞみ|ひかり|こだま|はやぶさ|こまち|つばさ|やまびこ|なすの|とき|たにがわ|かがやき|はくたか|つるぎ|さくら|みずほ|つばめ)\d*号?$/u, '');
        // 「特急」「通勤急行」「アクセス特急」等の種別語は末尾から剥がす。種別語が
        // 2つ重なっているケースもあるため、これ以上剥がれなくなるまで繰り返す。
        const suffixPattern = /(特別快速|通勤特快|通勤快速|通勤急行|通勤準急|通勤特急|アクセス特急|アクセス快特|中央特快|青梅特快|快速急行|区間急行|区間快速|新快速|特急|急行|快速|準急|各停|普通|通勤|アクセス)$/u;
        let previous;
        do {
          previous = cleaned;
          cleaned = cleaned.replace(suffixPattern, '');
        } while (cleaned !== previous);
        return cleaned;
      }
      ).filter(Boolean) // 種別語だけの行（例：「アクセス特急」単独）は除去し切って空文字になるため、結合対象から外す
      .join(' ').replace(/\s+/gu, ' ').trim();
      return { type, fare, line: lineName };
    },

    // 貼り付けテキスト全体を「駅・地点ノード」の並びと、その間を埋める
    // 「区間ブロック（鉄道/バス/飛行機/徒歩）」に分解し、Section配列にする。
    parse(lines) {
      const nodeIdx = [];
      lines.forEach((line, i) => { if (this.isPlaceLine(line)) nodeIdx.push(i); });
      const nodes = nodeIdx.map(i => this.extractPlace(lines[i]));

      const sections = [];
      for (let k = 0; k < nodeIdx.length - 1; k++) {
        const block = lines.slice(nodeIdx[k] + 1, nodeIdx[k + 1]);
        const info = this.classifyBlock(block);
        sections.push({ from: nodes[k], to: nodes[k + 1], ...info });
      }
      return sections;
    }
  };

  const WalkResolver = {
    // 徒歩区間（例：立川南→徒歩→立川）を除去するだけで、
    // 前後の駅がそのまま繋がり、実際に運賃が発生した区間だけが残る。
    resolve(sections) {
      return sections.filter(section => section.type !== 'walk');
    }
  };

  const RouteNormalizer = {
    normalize(paidSections) {
      if (!paidSections.length) return null;
      const origin = paidSections[0].from;
      const destination = paidSections[paidSections.length - 1].to;
      const viaStations = paidSections.slice(1).map(section => section.from);
      const types = new Set(paidSections.map(section => section.type));
      let transportType;
      if (types.has('rail') && types.has('bus')) transportType = '鉄道・バス';
      else if (types.has('bus')) transportType = 'バス';
      else transportType = '鉄道';
      // 利用路線名（例：「ＪＲ南武線 川崎行」）。1区間の中に複数の乗換がある場合は
      // 「→」で繋げて全て残す。路線名は必須情報ではないため、取れなければ空文字のまま。
      const routeLines = paidSections.map(section => section.line).filter(Boolean).join(' → ');
      return {
        origin,
        destination,
        viaStations: viaStations.length ? viaStations.join(' → ') : 'なし',
        transportType,
        routeLines
      };
    }
  };

  const ExpenseConverter = {
    convert(rawText) {
      const lines = YahooTextReader.toLines(rawText);
      const fare = YahooTextReader.extractHeaderFare(rawText);
      const sections = SectionParser.parse(lines);
      const paidSections = WalkResolver.resolve(sections);
      const normalized = RouteNormalizer.normalize(paidSections);
      const result = { fare };
      if (normalized) Object.assign(result, normalized);
      result.sections = sections;
      result.paidSections = paidSections;
      return result;
    }
  };

  function parseRouteText(text) {
    return ExpenseConverter.convert(text);
  }

  /* ============================================================
     複数区間（最大10区間）の管理。
     区間ごとにカードをDOMへ追加/削除するだけで、既存の値は保持される
     （毎回作り直すと入力済みの内容が消えてしまうため）。
     ============================================================ */

  function segmentsContainer() { return $('segmentsContainer'); }
  function segmentCards() { return [...segmentsContainer().querySelectorAll('.segment-card')]; }

  function addSegment() {
    const cards = segmentCards();
    if (cards.length >= MAX_SEGMENTS) return;
    // 次の区間を追加するタイミングで、直前の区間が入力済みならたたんで場所を空ける。
    // （貼り付け直後にいきなりたたまれると驚くため、たたむのは「次に進んだ」ときだけにする）
    const previous = cards[cards.length - 1];
    if (previous && segmentIsComplete(previous)) setSegmentCollapsed(previous, true);

    segmentSeq += 1;
    const template = $('segmentTemplate');
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.segment-card');
    card.dataset.segmentId = String(segmentSeq);
    segmentsContainer().append(fragment);
    bindSegmentEvents(card);
    renumberSegments();
    updateSegmentControls();
    return card;
  }

  function removeSegment(card) {
    if (segmentCards().length <= 1) return; // 最低1区間は残す
    card.remove();
    renumberSegments();
    updateSegmentControls();
    calculateAmount();
  }

  function renumberSegments() {
    segmentCards().forEach((card, index) => {
      card.querySelector('.segment-card__title').textContent = `区間 ${index + 1}`;
    });
  }

  function updateSegmentControls() {
    const count = segmentCards().length;
    $('addSegmentButton').disabled = count >= MAX_SEGMENTS;
    $('segmentLimitNote').textContent = count >= MAX_SEGMENTS ? '区間は最大6件までです。' : '';
    segmentCards().forEach(card => {
      card.querySelector('.seg-remove').hidden = count <= 1;
    });
  }

  function bindSegmentEvents(card) {
    const rawInput = card.querySelector('.seg-raw');
    const parseBtn = card.querySelector('.seg-parse');
    const clearBtn = card.querySelector('.seg-clear');
    const removeBtn = card.querySelector('.seg-remove');
    const toggleBtn = card.querySelector('.seg-toggle');
    const summaryBtn = card.querySelector('.segment-summary');
    const fareInput = card.querySelector('.seg-fare');

    parseBtn.addEventListener('click', () => updateSegmentSummary(card, parseRouteText(rawInput.value)));
    rawInput.addEventListener('paste', () => setTimeout(() => updateSegmentSummary(card, parseRouteText(rawInput.value)), 0));
    clearBtn.addEventListener('click', () => clearSegment(card));
    removeBtn.addEventListener('click', () => removeSegment(card));
    toggleBtn.addEventListener('click', () => setSegmentCollapsed(card, !card.classList.contains('is-collapsed')));
    summaryBtn.addEventListener('click', () => setSegmentCollapsed(card, false));
    fareInput.addEventListener('input', () => { calculateAmount(); refreshSegmentSummaryText(card); });
    card.querySelector('.seg-transport').addEventListener('change', () => updateSegmentOtherVisibility(card));
    ['seg-origin', 'seg-destination', 'seg-transport'].forEach(cls => {
      card.querySelector(`.${cls}`).addEventListener('input', () => refreshSegmentSummaryText(card));
      card.querySelector(`.${cls}`).addEventListener('change', () => refreshSegmentSummaryText(card));
    });
  }

  function updateSegmentOtherVisibility(card) {
    const isOther = card.querySelector('.seg-transport').value === 'その他';
    const wrap = card.querySelector('.seg-other-wrap');
    const detail = card.querySelector('.seg-other-detail');
    wrap.hidden = !isOther;
    detail.required = isOther;
    if (!isOther) detail.value = '';
  }

  function segmentSummaryText(card) {
    const origin = card.querySelector('.seg-origin').value.trim();
    const destination = card.querySelector('.seg-destination').value.trim();
    const transport = card.querySelector('.seg-transport').value;
    const fare = Number(card.querySelector('.seg-fare').value || 0);
    if (!origin || !destination) return '（未入力）';
    return `${origin} → ${destination}${transport ? `（${transport}）` : ''}　${fare.toLocaleString()}円`;
  }

  function refreshSegmentSummaryText(card) {
    card.querySelector('.segment-summary').textContent = segmentSummaryText(card);
  }

  function setSegmentCollapsed(card, collapsed) {
    card.classList.toggle('is-collapsed', collapsed);
    card.querySelector('.segment-body').hidden = collapsed;
    card.querySelector('.segment-summary').hidden = !collapsed;
    card.querySelector('.seg-toggle').textContent = collapsed ? 'ひらく' : 'たたむ';
    if (collapsed) refreshSegmentSummaryText(card);
  }

  function segmentIsComplete(card) {
    return Boolean(
      card.querySelector('.seg-origin').value.trim()
      && card.querySelector('.seg-destination').value.trim()
      && card.querySelector('.seg-via').value.trim()
      && card.querySelector('.seg-transport').value
      && card.querySelector('.seg-fare').value !== ''
    );
  }

  function updateSegmentSummary(card, result) {
    if (result.origin) card.querySelector('.seg-origin').value = result.origin;
    if (result.destination) card.querySelector('.seg-destination').value = result.destination;
    if (result.viaStations) card.querySelector('.seg-via').value = result.viaStations;
    if (result.transportType) card.querySelector('.seg-transport').value = result.transportType;
    if (result.fare != null) card.querySelector('.seg-fare').value = result.fare;
    if (result.routeLines) card.querySelector('.seg-route-line').value = result.routeLines;
    updateSegmentOtherVisibility(card);

    const missing = [];
    if (!result.origin) missing.push('乗車地');
    if (!result.destination) missing.push('降車地');
    if (!result.viaStations) missing.push('経由地');
    if (!result.transportType) missing.push('利用種別');
    if (result.fare == null) missing.push('IC運賃');

    const message = card.querySelector('.seg-message');
    if (missing.length) {
      message.classList.add('message--caution');
      message.classList.remove('message--success');
      message.textContent = `${missing.join('・')}を自動抽出できませんでした。下の欄へ直接入力してください。`;
    } else {
      message.classList.remove('message--caution');
      message.classList.add('message--success');
      message.textContent = '実際に運賃が発生した乗車区間だけを抽出しました。内容を確認してください。';
    }
    message.hidden = false;
    calculateAmount();
  }

  function clearSegment(card) {
    card.querySelector('.seg-raw').value = '';
    card.querySelector('.seg-message').hidden = true;
    ['seg-origin', 'seg-destination', 'seg-via', 'seg-transport', 'seg-fare', 'seg-route-line', 'seg-other-detail'].forEach(cls => {
      card.querySelector(`.${cls}`).value = '';
    });
    updateSegmentOtherVisibility(card);
    setSegmentCollapsed(card, false);
    calculateAmount();
  }

  function resetSegments() {
    segmentCards().slice(1).forEach(card => card.remove()); // 2件目以降を削除
    const first = segmentCards()[0];
    if (first) clearSegment(first);
    renumberSegments();
    updateSegmentControls();
  }

  function segmentFareSum() {
    return segmentCards().reduce((sum, card) => sum + Number(card.querySelector('.seg-fare').value || 0), 0);
  }

  function calculateAmount() {
    const fareSum = segmentFareSum();
    $('fareSumView').textContent = fareSum.toLocaleString();
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const amount = tripType === 'roundTrip' ? fareSum * 2 : fareSum;
    $('claimedAmountView').textContent = amount.toLocaleString();
    return amount;
  }

  function collectSegments() {
    return segmentCards().map(card => ({
      origin: card.querySelector('.seg-origin').value.trim(),
      viaStations: card.querySelector('.seg-via').value.trim(),
      destination: card.querySelector('.seg-destination').value.trim(),
      transportType: card.querySelector('.seg-transport').value,
      icFare: Number(card.querySelector('.seg-fare').value || 0),
      routeLine: card.querySelector('.seg-route-line').value.trim(),
      otherDetail: card.querySelector('.seg-other-detail').value.trim(),
      routeRawText: card.querySelector('.seg-raw').value
    }));
  }

  function currentSection() {
    const option = $('sectionCode').selectedOptions[0];
    return { code: option?.value || '', name: option?.dataset.name || '' };
  }

  function formDataObject() {
    const section = currentSection();
    const segments = collectSegments();
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || {};
    const transportTypes = [...new Set(segments.map(s => s.transportType).filter(Boolean))];

    return {
      employeeType: document.querySelector('input[name="employeeType"]:checked')?.value || '',
      division: $('division').value,
      store: $('store').value,
      sectionCode: section.code,
      sectionName: section.name,
      applicantName: $('applicantName').value.trim(),
      applicantStaffName: currentApplicantStaff()?.name || '',
      approverName: $('approverSelect').value,
      applicationDate: $('applicationDate').value,
      travelDate: $('travelDate').value,
      businessDestination: $('businessDestination').value.trim(),
      purposeCategory: document.querySelector('input[name="purposeCategory"]:checked')?.value || '',
      purposeOther: $('purposeOther').value.trim(),
      purpose: (() => {
        const category = document.querySelector('input[name="purposeCategory"]:checked')?.value || '';
        return category === 'その他' ? $('purposeOther').value.trim() : category;
      })(),
      // 区間ごとの詳細（正データ）
      segments,
      // 既存スプレッドシート列との後方互換のための集計値
      origin: first.origin || '',
      destinationStation: last.destination || '',
      viaStations: segments.map((s, i) => `区間${i + 1}：${s.origin}→${s.viaStations && s.viaStations !== 'なし' ? s.viaStations + '→' : ''}${s.destination}`).join('／'),
      transportType: transportTypes.length > 1 ? transportTypes.join('・') : (transportTypes[0] || ''),
      icFare: segmentFareSum(),
      tripType: document.querySelector('input[name="tripType"]:checked').value,
      claimedAmount: calculateAmount(),
      // グローバルな備考欄は廃止したため、区間ごとの「その他」の内容から自動生成する
      // （スプレッドシートの「備考」列との後方互換のため）。
      remarks: segments.map((s, i) => s.otherDetail ? `区間${i + 1}：${s.otherDetail}` : '').filter(Boolean).join('／'),
      website: $('website').value,
      clientToken: clientToken || (clientToken = makeClientToken()),
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
  }

  function makeClientToken() {
    return `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function buildPreview(data) {
    const tripNames = { oneWay: '片道', roundTrip: '同額往復', custom: '手修正' };
    const segmentRows = data.segments.map((s, i) => escapeHtml(
      `区間${i + 1}：${s.origin} → ${s.viaStations && s.viaStations !== 'なし' ? s.viaStations + ' → ' : ''}${s.destination}（${s.transportType}${s.routeLine ? '／' + s.routeLine : ''}／${s.icFare.toLocaleString()}円）`
    )).join('<br>');
    const rows = [
      ['申請者区分', data.employeeType],
      ['申請者', `${data.division}／${data.store}／${data.sectionName}（${data.sectionCode.slice(2)}）　${data.applicantName}`],
      ['申請日', data.applicationDate], ['出張日', data.travelDate], ['出張先', data.businessDestination],
      ['目的', data.purpose]
    ];
    $('previewContent').innerHTML = `<dl>${rows.map(([k,v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}
      <dt>移動区間</dt><dd>${segmentRows}</dd>
      <dt>IC運賃合計</dt><dd>${data.icFare.toLocaleString()}円</dd>
      <dt>申請区分</dt><dd>${escapeHtml(tripNames[data.tripType])}</dd>
      <dt>申請額</dt><dd>${data.claimedAmount.toLocaleString()}円</dd>
      <dt>備考</dt><dd>${escapeHtml(data.remarks || 'なし')}</dd>
      <dt>承認者</dt><dd>${data.approverName ? escapeHtml(data.approverName) + '（メールで承認依頼を送ります）' : '指定なし（対面で押印してもらってください）'}</dd>
    </dl>`;
    // 承認者を選択している場合は「承認要請」（メールでOTP付き承認依頼）、
    // 選択していない場合（対面で押印してもらう運用）は「登録・印刷」に切り替える。
    // 対面運用では承認スタンプは無く、S/Sへ登録したうえで、その場で印刷して
    // 押印してもらうだけの流れになるため、ボタンの意味合いを分ける。
    submitButton.textContent = data.approverName ? '承認要請' : '登録・印刷';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  let lastApplicationId = '';
  let pendingPrintContext = { data: null, applicationId: '' };

  function openPrintDialog(data, applicationId) {
    pendingPrintContext = { data, applicationId };
    $('printDialog').showModal();
  }
  let lastSubmittedData = null;

  const PURPOSE_CATEGORIES = ['展示会', '商談', '買出', '研修会', '応援'];

  function purposeLineHtml(data) {
    const wrap = (label, selected) => selected
      ? `<span class="print-purpose-selected">${escapeHtml(label)}</span>`
      : escapeHtml(label);
    const mainParts = PURPOSE_CATEGORIES.map(opt => wrap(opt, data.purposeCategory === opt)).join('・');
    const otherSelected = data.purposeCategory === 'その他';
    const otherDetail = otherSelected ? escapeHtml(data.purposeOther || '') : '';
    return `${mainParts}・${wrap('その他', otherSelected)}（${otherDetail}）`;
  }

  // 区間の内容量（行数）に応じてフォントサイズと余白を自動で縮める（GAS側と同じ考え方）。
  // 枠は固定（overflow）にするため、内容が多いほど文字を小さくして収める。
  function segmentFontTier(totalLines) {
    if (totalLines <= 6) return { fontSize: 12, subFontSize: 11, padding: '2px 8px', gap: '1px', lineHeight: '1.15' };
    if (totalLines <= 9) return { fontSize: 11, subFontSize: 10, padding: '2px 8px', gap: '1px', lineHeight: '1.1' };
    if (totalLines <= 13) return { fontSize: 10, subFontSize: 9, padding: '1px 8px', gap: '0px', lineHeight: '1.1' };
    return { fontSize: 9, subFontSize: 8, padding: '1px 8px', gap: '0px', lineHeight: '1.05' };
  }

  function routeRowsHtml(data) {
    const totalLines = data.segments.reduce((sum, s) => {
      let lines = 1;
      if (s.routeLine) lines += 1;
      if (s.transportType === 'その他' && s.otherDetail) lines += 1;
      return sum + lines;
    }, 0);
    const tier = segmentFontTier(totalLines);

    return data.segments.map((s, i) => {
      const routePrefix = data.tripType === 'roundTrip' ? '（往復）' : '';
      const routeLine = `${routePrefix}${s.origin}${s.viaStations && s.viaStations !== 'なし' ? '～' + s.viaStations.replace(/\s*→\s*/gu, '～') : ''}～${s.destination}`;
      const usedLines = s.routeLine ? s.routeLine.replace(/\s*→\s*/gu, '/') : '';
      const otherLine = s.transportType === 'その他' && s.otherDetail ? `その他：${s.otherDetail}` : '';
      return `
        <div class="print-segment-block" style="padding:${tier.padding};">
          <div class="print-segment-route" style="font-size:${tier.fontSize}px;line-height:${tier.lineHeight};">区間：${escapeHtml(routeLine)}</div>
          ${usedLines ? `<div class="print-segment-line" style="font-size:${tier.subFontSize}px;line-height:${tier.lineHeight};margin-top:${tier.gap};">利用路線：${escapeHtml(usedLines)}</div>` : ''}
          ${otherLine ? `<div class="print-segment-line" style="font-size:${tier.subFontSize}px;line-height:${tier.lineHeight};margin-top:${tier.gap};">${escapeHtml(otherLine)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // 苗字の文字数に応じてフォントサイズを縮める（3文字以上でも丸からはみ出さないように）。
  function sealFontSize(length) {
    if (length <= 1) return 13;
    if (length === 2) return 11;
    if (length === 3) return 9;
    return 7; // 4文字以上（かなり稀だが念のため）
  }

  function sealHtml(surname) {
    if (!surname) return '';
    const size = sealFontSize(surname.length);
    return `<span class="print-seal" style="font-size:${size}px;">${escapeHtml(surname)}</span>`;
  }

  // 1部（申請用 or 係控え）ぶんのHTMLを組み立てる。上下で内容は完全に同一。
  function buildCopyHtml(data, applicationId, copyLabel, showApplicantSeal) {
    const today = new Date();
    const dateText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    return `
      <div class="print-sheet">
        <div class="print-title-row">
          <h1>交通費申請書</h1>
          <div class="print-date">${escapeHtml(data.applicationDate || dateText)}${copyLabel ? `　（${escapeHtml(copyLabel)}）` : ''}</div>
        </div>

        <div class="print-content-box">
          <table class="print-table">
            <tr>
              <td class="print-lbl" style="width:58px;">申請者</td>
              <td class="print-val" colspan="3">${escapeHtml(data.division)}／${escapeHtml(data.store)}／${escapeHtml(data.sectionName)}（${escapeHtml(data.sectionCode.slice(2))}）　${escapeHtml(data.applicantName)}</td>
            </tr>
            <tr>
              <td class="print-lbl" style="width:58px;">出張日</td>
              <td class="print-val" colspan="3">${escapeHtml(data.travelDate)}</td>
            </tr>
            <tr>
              <td class="print-lbl" style="width:58px;">出張先</td>
              <td class="print-val" colspan="3">${escapeHtml(data.businessDestination)}</td>
            </tr>
            <tr>
              <td class="print-lbl">目　的</td>
              <td class="print-val" colspan="3">${purposeLineHtml(data)}</td>
            </tr>
          </table>

          <div class="print-segment-list">
            ${routeRowsHtml(data)}
          </div>

          <table class="print-table print-lower-table">
            <tr>
              <td class="print-stamp-cell">認印<div class="print-stamp-box">${showApplicantSeal ? sealHtml(applicantSurname(data)) : ''}</div></td>
              <td class="print-stamp-cell">経理<div class="print-stamp-box"></div></td>
              <td class="print-stamp-cell">所属上長<div class="print-stamp-box"></div></td>
              <td class="print-amount-cell">
                <div class="print-amount-row"><span>運賃計</span><span class="print-amount">${data.claimedAmount.toLocaleString()}円</span></div>
                <div class="print-amount-row"><span>合　計</span><span class="print-amount">${data.claimedAmount.toLocaleString()}円</span></div>
              </td>
            </tr>
          </table>
        </div>


        <p class="print-claim-line">上記の金額を請求致します${applicationId ? `（受付番号　${escapeHtml(applicationId)}）` : ''}</p>
      </div>
    `;
  }

  function applicantSurname(data) {
    const staff = staffDirectory.find(s => s.name === data.applicantName);
    if (staff && staff.surname) return staff.surname;
    return String(data.applicantName || '').trim().split(/[ 　]+/)[0] || '';
  }

  function buildPrintArea(data, applicationId, showApplicantSeal) {
    // B6の実寸（128mm）を根拠に、B5用紙1枚に上下2部を固定サイズで収める。
    $('printArea').innerHTML = `
      <div class="print-page">
        ${buildCopyHtml(data, applicationId, '', showApplicantSeal)}
        <div class="print-cut-line"><span>切り取り線</span></div>
        ${buildCopyHtml(data, applicationId, '係控え', showApplicantSeal)}
      </div>
    `;
  }


  function printData(data, applicationId, showApplicantSeal) {
    buildPrintArea(data, applicationId, showApplicantSeal);
    window.print();
  }

  async function fetchStaffDirectory() {
    const endpoint = window.APP_CONFIG?.GAS_ENDPOINT;
    if (!endpoint) return []; // GAS未設定時（デモ環境）は名簿なしとして動く
    // GASのWebアプリはGETリクエストへのCORSヘッダーが安定しないため、
    // <script>タグ経由のJSONPで取得する（CORSの制約を受けない）。
    return new Promise(resolve => {
      const callbackName = `staffDirectoryCallback_${Date.now()}`;
      const script = document.createElement('script');
      let settled = false;

      const finish = staff => {
        if (settled) return;
        settled = true;
        delete window[callbackName];
        script.remove();
        clearTimeout(timer);
        resolve(staff);
      };

      window[callbackName] = result => finish(result && result.ok ? result.staff : []);
      script.onerror = () => { console.error('名簿の取得に失敗しました（JSONP読み込みエラー）'); finish([]); };
      const timer = setTimeout(() => { console.error('名簿の取得がタイムアウトしました'); finish([]); }, 10000);

      script.src = `${endpoint}?action=staffDirectory&callback=${callbackName}`;
      document.head.appendChild(script);
    });
  }

  // 隠しiframe＋フォームでPOSTする。ブラウザの「フォーム送信（ページ遷移）」は
  // fetchと違ってCORSの制約を受けないため、確実に届く。ただしその代わり、
  // レスポンス本文は読めない（iframeの中身はクロスオリジンなので取得不可）。
  function postViaHiddenForm(endpoint, payloadJson) {
    return new Promise(resolve => {
      const frameName = `gasSubmitFrame_${Date.now()}`;
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = endpoint;
      form.target = frameName;
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = payloadJson;
      form.appendChild(input);
      document.body.appendChild(form);

      // iframeのload完了は「GASから何らかの応答が返ってきた」タイミングの目安にはなるが、
      // 中身は読めないので、これ単独では成功/失敗の判定に使わない
      // （本当の確認はJSONPのcheckSubmissionで行う）。
      iframe.addEventListener('load', () => {
        setTimeout(() => { form.remove(); iframe.remove(); }, 500);
        resolve();
      }, { once: true });

      form.submit();
    });
  }

  // GET（JSONP、CORSの制約を受けない）で、実際にclientTokenの申請が
  // スプレッドシートに保存されたかを確認する。「見なし」ではなく実際の確認。
  function checkSubmissionStatus(endpoint, clientToken) {
    return new Promise(resolve => {
      const callbackName = `checkSubmissionCallback_${Date.now()}`;
      const script = document.createElement('script');
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        delete window[callbackName];
        script.remove();
        resolve(result && result.ok ? result : { found: false });
      };
      window[callbackName] = result => finish(result);
      script.onerror = () => finish({ found: false });
      script.src = `${endpoint}?action=checkSubmission&clientToken=${encodeURIComponent(clientToken)}&callback=${callbackName}`;
      document.head.appendChild(script);
    });
  }

  // 承認確定（confirmApprovalOtp）用：fetchの応答が読めない場合に、
  // 「本当に承認されたか」をJSONP（CORSの制約を受けない）で確認する。
  function checkApprovalStatus(endpoint, applicationId) {
    return new Promise(resolve => {
      const callbackName = `checkApprovalCallback_${Date.now()}`;
      const script = document.createElement('script');
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        delete window[callbackName];
        script.remove();
        resolve(result && result.ok ? result : { found: false, approved: false });
      };
      window[callbackName] = result => finish(result);
      script.onerror = () => finish({ found: false, approved: false });
      script.src = `${endpoint}?action=checkApprovalStatus&applicationId=${encodeURIComponent(applicationId)}&callback=${callbackName}`;
      document.head.appendChild(script);
    });
  }

  async function submitToGas(data) {
    const endpoint = window.APP_CONFIG?.GAS_ENDPOINT;
    if (!endpoint) {
      const id = `TR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-DEMO`;
      localStorage.setItem('travelExpense.lastDemoSubmission', JSON.stringify({ id, data }));
      return { ok: true, applicationId: id, demo: true };
    }

    const payloadJson = JSON.stringify({ action: 'submitTravelExpense', payload: data });

    try {
      // 通常はfetchで送信・応答の両方を読む（バリデーションエラー等の詳細な
      // メッセージもここでそのまま受け取れる）。
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payloadJson
      });
      if (!response.ok) throw new Error(`送信に失敗しました（${response.status}）`);
      return await response.json();
    } catch (fetchError) {
      // fetchでの送信、または応答の読み取り（GAS特有のCORSの揺らぎ）に失敗した場合の保険。
      // GAS側の処理自体は完了していることが多いため、まずは「見なし」ではなく
      // JSONP（CORSの制約を受けない）で実際に保存されたかを確認する。
      console.error('fetch送信でエラーが発生したため、保存状況を別ルートで確認します', fetchError);
      let status = await checkSubmissionStatus(endpoint, data.clientToken);
      if (!status.found) {
        // まだ保存が確認できない場合だけ、隠しフォームで念のため送信し直す
        // （clientTokenが同じなので、二重に保存されることはない）。
        await postViaHiddenForm(endpoint, payloadJson);
        for (let attempt = 0; attempt < 15 && !status.found; attempt++) {
          await new Promise(r => setTimeout(r, 1000));
          status = await checkSubmissionStatus(endpoint, data.clientToken);
        }
      }
      if (status.found) return { ok: true, applicationId: status.applicationId, emailSendFailed: status.emailSendFailed };
      throw new Error('送信の確認が取れませんでした。ネットワークの状態を確認し、時間をおいて再度お試しください。');
    }
  }

  function showSubmitError(message) {
    const banner = $('submitErrorBanner');
    // Google側の内部エラー（英語・権限スコープ等の技術的な文言）はそのまま出さず、
    // 分かりやすい日本語に置き換える。それ以外（こちらで投げているバリデーションエラー等）はそのまま表示する。
    const friendly = /does not have permission|Required permissions|googleapis\.com/i.test(message || '')
      ? '送信処理でシステム側のエラーが発生しました。時間をおいて再度お試しいただくか、情報通信課へご連絡ください。'
      : (message || '送信中にエラーが発生しました。');
    banner.textContent = friendly;
    banner.hidden = false;
    banner.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  function hideSubmitError() {
    $('submitErrorBanner').hidden = true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    hideSubmitError();
    submitButton.disabled = true;
    saveState.textContent = '送信中';
    $('submitProcessingMessage').hidden = false;
    try {
      const data = formDataObject();
      const result = await submitToGas(data);
      if (!result.ok) throw new Error(result.message || '申請を保存できませんでした。');
      saveApplicant(data);
      saveState.textContent = '申請済み';
      lastApplicationId = result.applicationId;
      lastSubmittedData = data;
      $('completeApplicationId').textContent = result.applicationId;
      // 承認者を選択したか（メールでOTP承認依頼）／選択していないか（対面で押印。
      // 承認スタンプは無く、登録後その場で印刷して提出する運用）で、案内文を分ける。
      const hasApprover = Boolean(data.approverName);
      $('completeNote').textContent = result.demo
        ? '現在はデモ保存です。GAS URLを設定すると本番保存になります。'
        : !hasApprover
          ? '登録しました。このまま印刷し、押印のうえ提出してください。'
          : result.emailSendFailed
            ? '申請は保存されましたが、承認依頼メール（ワンタイムコード）の送信に失敗しました。お手数ですが承認者へ直接ご連絡ください。'
            : '承認者へワンタイムコード付きのメールを送信しました。';
      $('completeNote').classList.toggle('field-note--warning', Boolean(result.emailSendFailed));

      previewDialog.close();
      completeDialog.showModal();
      // 対面運用（承認者未選択）は「登録・印刷」の一連の操作のため、登録完了と
      // 同時に印刷ダイアログも開き、その場で印刷まで進められるようにする。
      if (!result.demo && !hasApprover) {
        openPrintDialog(data, result.applicationId);
      }
      clientToken = '';
    } catch (error) {
      saveState.textContent = '送信失敗';
      submitButton.disabled = false;
      previewDialog.close(); // エラーバナーは本体側にあるため、確認画面を閉じて見えるようにする
      showSubmitError(error.message);
    } finally {
      $('submitProcessingMessage').hidden = true;
    }
  }

  async function handleConfirmApproval() {
    const applicationId = $('approvalApplicationId').value.trim();
    const otp = $('approvalOtp').value.trim();
    $('approvalErrorMessage').hidden = true;
    $('approvalSuccessMessage').hidden = true;
    $('approvalProcessingMessage').hidden = true;

    if (!applicationId || !otp) {
      $('approvalErrorMessage').textContent = '受付番号とワンタイムコードの両方を入力してください。';
      $('approvalErrorMessage').hidden = false;
      return;
    }

    const endpoint = window.APP_CONFIG?.GAS_ENDPOINT;
    if (!endpoint) {
      $('approvalErrorMessage').textContent = '現在はデモ環境のため、承認処理はできません。';
      $('approvalErrorMessage').hidden = false;
      return;
    }

    $('confirmApprovalButton').disabled = true;
    $('approvalProcessingMessage').hidden = false;
    try {
      const payloadJson = JSON.stringify({ action: 'confirmApprovalOtp', payload: { applicationId, otp } });
      let result;
      try {
        // 通常はfetchで送信・応答の両方を読む（詳細なエラーメッセージもそのまま受け取れる）。
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payloadJson
        });
        result = await response.json();
      } catch (fetchError) {
        // fetchでの送信・応答の読み取り（GAS特有のCORSの揺らぎ）に失敗した場合の保険。
        // 隠しフォームで念のため送信し直し、実際に承認されたかをJSONPで確認する。
        console.error('fetch送信でエラーが発生したため、承認状況を別ルートで確認します', fetchError);
        await postViaHiddenForm(endpoint, payloadJson);
        let status = { approved: false };
        for (let attempt = 0; attempt < 15 && !status.approved; attempt++) {
          await new Promise(r => setTimeout(r, 1000));
          status = await checkApprovalStatus(endpoint, applicationId);
        }
        result = status.approved
          ? { ok: true, message: `承認しました。${status.applicantName || ''} さんへ、押印済みのPDFを送信しました。` }
          : { ok: false, message: '通信状況が不安定なため、承認できたか確認が取れませんでした。時間をおいて、受付番号とワンタイムコードをもう一度お試しください。' };
      }

      $('approvalProcessingMessage').hidden = true;
      if (result.ok) {
        $('approvalSuccessMessage').textContent = result.message || '承認しました。';
        $('approvalSuccessMessage').hidden = false;
        $('confirmApprovalButton').disabled = true;
      } else {
        $('approvalErrorMessage').textContent = result.message || '承認に失敗しました。';
        $('approvalErrorMessage').hidden = false;
        $('confirmApprovalButton').disabled = false;
      }
    } catch (error) {
      $('approvalProcessingMessage').hidden = true;
      $('approvalErrorMessage').textContent = '通信エラーが発生しました。時間をおいて再度お試しください。';
      $('approvalErrorMessage').hidden = false;
      $('confirmApprovalButton').disabled = false;
    }
  }

  function closeComplete() {
    completeDialog.close();
    const applicant = {
      employeeType: document.querySelector('input[name="employeeType"]:checked')?.value || '',
      division: $('division').value,
      store: $('store').value,
      sectionCode: $('sectionCode').value
    };
    form.reset();
    $('applicationDate').value = new Date().toISOString().slice(0, 10);
    document.querySelector(`input[name="employeeType"][value="${CSS.escape(applicant.employeeType)}"]`)?.click();
    $('division').value = applicant.division;
    populateStores(applicant.store);
    populateSections(applicant.sectionCode);
    populateStaffNameList();
    updateApplicantNameAvailability();
    // 申請者名はあえて復元しない（共有端末で次の人が別人の名前のまま送信する事故を防ぐため）。
    // 事業部・店・係・申請者区分は変更頻度が低いので、利便性のため引き続き復元する。
    updateApplicantStaffHint(); // 氏名が空になった状態に合わせて、承認者欄・ヒントをリセットする
    resetSegments();
    saveState.textContent = '入力中';
    submitButton.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
