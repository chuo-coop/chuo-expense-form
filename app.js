(() => {
  'use strict';

  const ORGANIZATION_MASTER = [{"code":"001100","section":"書籍","division":"多摩店舗事業部","store":"物販店"},{"code":"001200","section":"外売","division":"多摩店舗事業部","store":"物販店"},{"code":"001400","section":"図書館","division":"多摩店舗事業部","store":"物販店"},{"code":"001900","section":"市ヶ谷田町","division":"都心店舗事業部","store":"都心店舗"},{"code":"002200","section":"購買","division":"多摩店舗事業部","store":"物販店"},{"code":"002300","section":"私厚連運営","division":"総務部","store":"情報通信"},{"code":"002500","section":"派遣","division":"多摩店舗事業部","store":"物販店"},{"code":"002900","section":"店舗管理","division":"多摩店舗事業部","store":"物販店"},{"code":"003110","section":"軽食","division":"食堂事業部","store":"多摩食堂"},{"code":"003210","section":"1階食堂","division":"食堂事業部","store":"多摩食堂"},{"code":"003220","section":"2階食堂","division":"食堂事業部","store":"多摩食堂"},{"code":"003230","section":"和おん","division":"食堂事業部","store":"多摩食堂"},{"code":"003240","section":"日和","division":"食堂事業部","store":"多摩食堂"},{"code":"003290","section":"調理","division":"食堂事業部","store":"多摩食堂"},{"code":"003310","section":"喫茶","division":"食堂事業部","store":"多摩食堂"},{"code":"003330","section":"四季","division":"食堂事業部","store":"多摩食堂"},{"code":"003400","section":"杉並高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003500","section":"附属高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003510","section":"附属中学食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003600","section":"理工 3号館食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003700","section":"理工 5号館食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003800","section":"横浜中学高校食堂","division":"食堂事業部","store":"都心食堂"},{"code":"003900","section":"食堂管理","division":"食堂事業部","store":"食堂管理"},{"code":"004000","section":"教育","division":"多摩店舗事業部","store":"サービス店"},{"code":"004100","section":"旅行国内","division":"多摩店舗事業部","store":"サービス店"},{"code":"004150","section":"旅行海外","division":"多摩店舗事業部","store":"サービス店"},{"code":"004200","section":"印刷","division":"多摩店舗事業部","store":"サービス店"},{"code":"004300","section":"通販","division":"多摩店舗事業部","store":"サービス店"},{"code":"004400","section":"理工","division":"都心店舗事業部","store":"理工店"},{"code":"004500","section":"杉並高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004600","section":"附属中学高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004700","section":"不動産","division":"不動産事業部","store":"不動産"},{"code":"004800","section":"横浜中学高校売店","division":"都心店舗事業部","store":"中高店"},{"code":"004900","section":"茗荷谷","division":"都心店舗事業部","store":"茗荷谷店"},{"code":"005100","section":"検収","division":"多摩店舗事業部","store":"物販店"},{"code":"005200","section":"情報通信","division":"総務部","store":"情報通信"},{"code":"005300","section":"庶務","division":"総務部","store":"総務"},{"code":"005400","section":"経理","division":"総務部","store":"総務"},{"code":"005500","section":"本部","division":"総務部","store":"総務"},{"code":"005600","section":"機関運営","division":"総務部","store":"総務"},{"code":"005700","section":"共済","division":"総務部","store":"共済"},{"code":"005800","section":"衛生管理","division":"総務部","store":"総務"},{"code":"005910","section":"学園中央開発","division":"不動産事業部","store":"不動産"},{"code":"005920","section":"学園中央開発","division":"不動産事業部","store":"施設管理"},{"code":"005930","section":"学園中央開発施設管理","division":"不動産事業部","store":"施設管理"},{"code":"006000","section":"新入生対応","division":"多摩店舗事業部","store":"情報通信"}];

  const $ = id => document.getElementById(id);
  const form = $('expenseForm');
  const customAmount = $('customAmount');
  const previewDialog = $('previewDialog');
  const completeDialog = $('completeDialog');
  const saveState = $('saveState');
  const submitButton = $('submitButton');
  const MAX_SEGMENTS = 10;
  let clientToken = '';
  let segmentSeq = 0;
  let staffDirectory = [];

  init();

  async function init() {
    populateDivisions();
    const today = new Date().toISOString().slice(0, 10);
    $('applicationDate').value ||= today;
    restoreApplicant();
    addSegment(); // 初期表示は1区間
    bindEvents();
    calculateAmount();

    staffDirectory = await fetchStaffDirectory();
    populateStaffNameList();
    updateApplicantStaffHint();
    populateApproverOptions();
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
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
    setSelectOptions($('division'), '選択してください', uniqueSorted(ORGANIZATION_MASTER.map(row => row.division)));
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
    $('division').addEventListener('change', () => { populateStores(); populateStaffNameList(); });
    $('store').addEventListener('change', () => populateSections());
    $('sectionCode').addEventListener('change', updateSectionNote);
    $('addSegmentButton').addEventListener('click', () => addSegment());
    document.querySelectorAll('input[name="purposeCategory"]').forEach(el => el.addEventListener('change', updatePurposeOtherVisibility));
    $('applicantName').addEventListener('input', updateApplicantStaffHint);
    document.querySelectorAll('input[name="employeeType"]').forEach(el => el.addEventListener('change', updateApplicantStaffHint));
    customAmount.addEventListener('input', calculateAmount);
    document.querySelectorAll('input[name="tripType"]').forEach(el => el.addEventListener('change', calculateAmount));

    $('previewButton').addEventListener('click', () => {
      if (!form.reportValidity()) return;
      buildPreview(formDataObject());
      previewDialog.showModal();
    });
    $('closePreview').addEventListener('click', () => previewDialog.close());
    $('closePreviewBottom').addEventListener('click', () => previewDialog.close());
    $('printButton').addEventListener('click', () => printData(formDataObject(), ''));
    $('submitFromPreviewButton').addEventListener('click', () => {
      previewDialog.close();
      form.requestSubmit(); // 通常の「申請する」ボタンと同じsubmitイベントを発火させる
    });
    $('printCompleteButton').addEventListener('click', () => printData(lastSubmittedData || formDataObject(), lastApplicationId));
    $('closeComplete').addEventListener('click', closeComplete);
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
    const divisionText = $('division').value;
    // 選択中の事業部と部課名がゆるく一致する人だけに絞る（例：「多摩店舗事業部」⊇「多摩」）。
    // 該当者が1人もいない場合は絞り込まず全員を出す（表記のズレで候補が消えてしまうのを避けるため）。
    const filtered = divisionText
      ? staffDirectory.filter(s => divisionText.includes(s.department) || s.department.includes(divisionText))
      : staffDirectory;
    const list = filtered.length ? filtered : staffDirectory;
    $('staffNameList').innerHTML = list.map(s => `<option value="${escapeHtml(s.name)}"></option>`).join('');
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
      $('applicantStaffHint').textContent = `名簿に一致：${staff.department}／${staff.title}（ランク${staff.rank}）`;
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
      + candidates.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}　${escapeHtml(s.department)}／${escapeHtml(s.title)}</option>`).join('');

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
        || /^(運転見合わせ|列車遅延|運休|遅延|見合わせ|人身事故|信号確認)$/u.test(line)
        || /^ルート\d+$/u.test(line)
        || /^(早|安|楽|早楽|安楽|ルート保存|定期券|ルート共有|印刷する)$/u.test(line)
        || /発→.*着.*分/u.test(line);                // ヘッダーのサマリー行
    },

    isWalk(line) { return /徒歩/u.test(line); },

    classifyBlock(blockLines) {
      const content = blockLines.filter(l => !this.isNoise(l));
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
      ).map(l => l.replace(/^(ＪＲ|JR)/u, '')).join(' ');
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
    $('segmentLimitNote').textContent = count >= MAX_SEGMENTS ? '区間は最大10件までです。' : '';
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
    ['seg-origin', 'seg-destination', 'seg-transport'].forEach(cls => {
      card.querySelector(`.${cls}`).addEventListener('input', () => refreshSegmentSummaryText(card));
      card.querySelector(`.${cls}`).addEventListener('change', () => refreshSegmentSummaryText(card));
    });
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
    ['seg-origin', 'seg-destination', 'seg-via', 'seg-transport', 'seg-fare', 'seg-route-line'].forEach(cls => {
      card.querySelector(`.${cls}`).value = '';
    });
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
    let amount = fareSum;
    if (tripType === 'roundTrip') amount = fareSum * 2;
    if (tripType === 'custom') amount = Number(customAmount.value || 0);
    $('customAmountWrap').hidden = tripType !== 'custom';
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
      remarks: $('remarks').value.trim(),
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
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  let lastApplicationId = '';
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

  const ROUTE_CELL_WIDTH_PX = 300; // 経路欄1列分の実効幅の見積り（余白込みで少し余裕を持たせる）
  const ROUTE_FONT_TIERS = [12, 11, 10, 9, 8, 7];

  // 文字幅を実測し、1行に収まる最大のフォントサイズを選ぶ（canvasが使えない環境では
  // 全角2・半角1の簡易換算にフォールバックする）。行の高さを文字量で変えないための仕組み。
  function fitFontSizeToWidth(text, maxWidthPx) {
    let ctx = null;
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch (e) { ctx = null; }
    for (const size of ROUTE_FONT_TIERS) {
      let width;
      if (ctx) {
        ctx.font = `${size}px "Noto Sans JP","Yu Gothic",sans-serif`;
        width = ctx.measureText(text).width;
      } else {
        const units = [...text].reduce((sum, ch) => sum + (ch.codePointAt(0) > 0x7F ? 2 : 1), 0);
        width = units * (size * 0.5);
      }
      if (width <= maxWidthPx) return size;
    }
    return ROUTE_FONT_TIERS[ROUTE_FONT_TIERS.length - 1];
  }

  function routeRowsHtml(data) {
    const routeLines = data.segments.map(s => `${s.origin}～${s.destination}${s.routeLine ? `（${s.routeLine}）` : ''}`);
    const rowCount = Math.max(4, Math.ceil(routeLines.length / 2));
    const leftLines = routeLines.slice(0, rowCount);
    const rightLines = routeLines.slice(rowCount);
    const cell = text => {
      if (!text) return '';
      const size = fitFontSizeToWidth(text, ROUTE_CELL_WIDTH_PX);
      const smallestTier = ROUTE_FONT_TIERS[ROUTE_FONT_TIERS.length - 1];
      // 最小フォントでも収まらない極端に長いテキストは、overflow:hiddenで
      // 中途半端に見切れるより、省略記号（…）で明示的に切った方が壊れて見えない。
      if (size === smallestTier) {
        let ctx = null;
        try { ctx = document.createElement('canvas').getContext('2d'); } catch (e) { ctx = null; }
        if (ctx) {
          ctx.font = `${smallestTier}px "Noto Sans JP","Yu Gothic",sans-serif`;
          if (ctx.measureText(text).width > ROUTE_CELL_WIDTH_PX) {
            let clipped = text;
            while (clipped.length > 1 && ctx.measureText(clipped + '…').width > ROUTE_CELL_WIDTH_PX) {
              clipped = clipped.slice(0, -1);
            }
            return `<span style="font-size:${smallestTier}px;">${escapeHtml(clipped)}…</span>`;
          }
        }
      }
      return `<span style="font-size:${size}px;">${escapeHtml(text)}</span>`;
    };
    return Array.from({ length: rowCount }, (_, i) => `
      <tr>
        <td class="print-route-cell">${cell(leftLines[i])}</td>
        <td class="print-route-cell">${cell(rightLines[i])}</td>
      </tr>
    `).join('');
  }

  // 1部（申請用 or 係控え）ぶんのHTMLを組み立てる。上下で内容は完全に同一。
  function buildCopyHtml(data, applicationId, copyLabel) {
    const today = new Date();
    const dateText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    return `
      <div class="print-sheet">
        <div class="print-title-row">
          <h1>交通費申請書</h1>
          <div class="print-date">${escapeHtml(data.applicationDate || dateText)}${copyLabel ? `　（${escapeHtml(copyLabel)}）` : ''}</div>
        </div>

        <table class="print-table">
          <tr>
            <td class="print-lbl" style="width:80px;">出張日</td>
            <td class="print-val">${escapeHtml(data.travelDate)}</td>
            <td class="print-lbl" style="width:80px;">出張先</td>
            <td class="print-val">${escapeHtml(data.businessDestination)}</td>
          </tr>
          <tr>
            <td class="print-lbl">目　的</td>
            <td class="print-val" colspan="3">${purposeLineHtml(data)}</td>
          </tr>
          <tr>
            <td class="print-lbl">内　容</td>
            <td class="print-val" colspan="3">${escapeHtml(data.remarks || '')}</td>
          </tr>
        </table>

        <table class="print-table print-routes">
          ${routeRowsHtml(data)}
        </table>

        <table class="print-table print-lower-table">
          <tr>
            <td class="print-stamp-cell">認印<div class="print-stamp-box"></div></td>
            <td class="print-stamp-cell">経理<div class="print-stamp-box"></div></td>
            <td class="print-stamp-cell">所属上長<div class="print-stamp-box"></div></td>
            <td class="print-amount-cell">
              <div class="print-amount-row"><span>運賃計</span><span class="print-amount">${data.icFare.toLocaleString()}円</span></div>
              <div class="print-amount-row"><span>合　計</span><span class="print-amount">${data.claimedAmount.toLocaleString()}円</span></div>
            </td>
          </tr>
        </table>

        <p class="print-claim-line">上記の金額を請求致します${applicationId ? `（受付番号　${escapeHtml(applicationId)}）` : ''}</p>
        <p class="print-section-seal">係　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　印</p>
      </div>
    `;
  }

  function buildPrintArea(data, applicationId) {
    // B5用紙1枚に、同一内容を上下2部（上＝申請用、下＝係控え）印刷し、
    // 真ん中は破線で区切って裁断できるようにする。
    $('printArea').innerHTML = `
      <div class="print-page">
        ${buildCopyHtml(data, applicationId, '')}
        <div class="print-cut-line"><span>✂　－　－　－　－　－　－　－　－　－　－　－　－　－　－　－　－</span></div>
        ${buildCopyHtml(data, applicationId, '係控え')}
      </div>
    `;
  }


  function printData(data, applicationId) {
    buildPrintArea(data, applicationId);
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

  async function submitToGas(data) {
    const endpoint = window.APP_CONFIG?.GAS_ENDPOINT;
    if (!endpoint) {
      const id = `TR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-DEMO`;
      localStorage.setItem('travelExpense.lastDemoSubmission', JSON.stringify({ id, data }));
      return { ok: true, applicationId: id, demo: true };
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'submitTravelExpense', payload: data })
    });
    if (!response.ok) throw new Error(`送信に失敗しました（${response.status}）`);
    return response.json();
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
    try {
      const data = formDataObject();
      const result = await submitToGas(data);
      if (!result.ok) throw new Error(result.message || '申請を保存できませんでした。');
      saveApplicant(data);
      saveState.textContent = '申請済み';
      lastApplicationId = result.applicationId;
      lastSubmittedData = data;
      $('completeApplicationId').textContent = result.applicationId;
      $('completeNote').textContent = result.demo ? '現在はデモ保存です。GAS URLを設定すると本番保存になります。' : '';
      completeDialog.showModal();
      clientToken = '';
    } catch (error) {
      saveState.textContent = '送信失敗';
      submitButton.disabled = false;
      showSubmitError(error.message);
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
    // 申請者名はあえて復元しない（共有端末で次の人が別人の名前のまま送信する事故を防ぐため）。
    // 事業部・店・係・申請者区分は変更頻度が低いので、利便性のため引き続き復元する。
    updateApplicantStaffHint(); // 氏名が空になった状態に合わせて、承認者欄・ヒントをリセットする
    resetSegments();
    saveState.textContent = '入力中';
    submitButton.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
