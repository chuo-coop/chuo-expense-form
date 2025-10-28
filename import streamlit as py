import streamlit as st
from datetime import date

st.set_page_config(page_title="出張旅費申請フォーム", layout="centered")
st.title("🚆 出張旅費申請フォーム（実務版）")

# ① 基本情報
st.header("1. 基本情報")
dept = st.selectbox("所属", ["総務部", "購買部", "食堂部", "都心店舗部", "不動産部", "その他"])
name = st.text_input("氏名")
travel_date = st.date_input("出張日", value=date.today())
purpose = st.text_area("出張目的", placeholder="例：会議出席、打合せ、説明会など")

# ② 区間情報
st.header("2. 区間・運賃情報")
origin = st.text_input("出発地（例：多摩センター）")
via1 = st.text_input("経由地1（省略可）")
via2 = st.text_input("経由地2（省略可）")
destination = st.text_input("到着地（例：御茶ノ水）")

# Yahoo乗換案内リンク生成
if origin and destination:
    url = f"https://transit.yahoo.co.jp/search/result?from={origin}"
    if via1:
        url += f"&via={via1}"
    if via2:
        url += f"&via2={via2}"
    url += f"&to={destination}"
    
    st.link_button("🔎 Yahoo乗換案内で経路・運賃を確認（切符・Suica表示あり）", url)
    st.caption("※Yahooページで運賃を確認後、この画面に戻って金額を入力してください。")

# ③ 金額入力
st.header("3. 運賃入力")
fare = st.number_input("片道運賃（円）", min_value=0, step=10)
roundtrip = st.checkbox("往復", value=True)
total = fare * (2 if roundtrip else 1)
st.text(f"支給額：{total} 円")

# ④ 備考
st.header("4. 備考")
memo = st.text_area("備考（経路や補足など）", placeholder="例：バス→多摩モノレール→JR中央線→丸ノ内線")

# ⑤ 申請送信
if st.button("申請を送信"):
    st.success(f"✅ {name or '（氏名未入力）'} さんの申請を受け付けました。経理処理待ちです。")
    st.info(f"""
【申請内容】
所属：{dept}
氏名：{name}
日付：{travel_date}
目的：{purpose}
区間：{origin} → {via1 or ''} → {via2 or ''} → {destination}
支給額：{total}円
""")
