import { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, BarChartIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, Cross2Icon, InfoCircledIcon, MinusIcon, Pencil1Icon, PlusIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { KeyboardInput, MobileScroll, useKeyboard } from "./mobile";

type Tab = "balance" | "plan" | "odds";
type PlanEvent = { id: number; label: string; orbs: number; date: string; source: string };
type Saved = { orbs: number; rank: number; limited: string; ownedNames: string; target: string; rate: number; pulls: number; reserve: number; deadline: string; events: PlanEvent[] };
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateAfter = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return dateString(date); };
const initial: Saved = {
  orbs: 320, rank: 450, limited: "12", ownedNames: "", target: "", rate: 0.6, pulls: 50, reserve: 300, deadline: dateAfter(15),
  events: [
    { id: 1, label: "未クリアクエスト", orbs: 50, date: dateAfter(8), source: "" },
    { id: 2, label: "ミッション", orbs: 30, date: dateAfter(11), source: "" },
    { id: 3, label: "その他の回収予定", orbs: 100, date: dateAfter(15), source: "" },
  ],
};
function loadData(): Saved {
  try { const raw = localStorage.getItem("orb-planner-v1"); if (!raw) return initial; const saved = JSON.parse(raw); return { ...initial, ...saved, events: (saved.events ?? initial.events).map((event: Partial<PlanEvent>) => ({ ...initial.events[0], ...event, source: event.source ?? "" })) }; }
  catch { return initial; }
}
const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");
const officialLink = (url: string) => {
  try { const parsed = new URL(url); return parsed.protocol === "https:" && ["monster-strike.com", "www.monster-strike.com", "static.monster-strike.com", "support.monster-strike.com"].includes(parsed.hostname) ? parsed.href : ""; }
  catch { return ""; }
};

export default function Prototype() {
  const [data, setData] = useState<Saved>(loadData);
  const [tab, setTab] = useState<Tab>("odds");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const keyboard = useKeyboard();
  useEffect(() => { localStorage.setItem("orb-planner-v1", JSON.stringify(data)); }, [data]);
  const update = <K extends keyof Saved>(key: K, value: Saved[K]) => setData((old) => ({ ...old, [key]: value }));
  const rate = Math.max(0, Math.min(100, Number(data.rate) || 0)) / 100;
  const pulls = Math.max(0, Math.floor(Number(data.pulls) || 0));
  const chance = rate === 1 ? 1 : 1 - Math.pow(1 - rate, pulls);
  const cost = pulls * 5;
  const today = dateString(new Date());
  const future = data.events.filter((event) => event.date >= today && event.date <= data.deadline).reduce((sum, event) => sum + (Number(event.orbs) || 0), 0);
  const maxSafePulls = Math.max(0, Math.floor((data.orbs + future - data.reserve) / 5));
  const daysLeft = Math.max(1, Math.ceil((new Date(`${data.deadline}T23:59:59`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000));
  const owned = data.ownedNames.split(/[、,，\s]+/).map((name) => name.trim()).filter(Boolean);
  const targetAlreadyOwned = data.target.trim().length > 0 && owned.includes(data.target.trim());
  const balanceAfter = data.orbs + future - cost;
  const reserveGap = Math.max(0, data.reserve - balanceAfter);
  const advice = useMemo(() => {
    if (targetAlreadyOwned) return { title: "所持キャラに登録されています", text: "入力した狙いキャラが所持リストに見つかりました。重複を狙う場合はそのまま、別のキャラなら名前を修正してください。", tone: "violet" };
    if (balanceAfter < data.reserve) return { title: "今は貯めるのがおすすめ", text: `この回数を引くと、キープ目標まで${fmt(reserveGap)}個不足します。回収予定を達成してから、もう一度試算しましょう。`, tone: "warn" };
    if (chance < 0.5) return { title: "回数を決めて慎重に", text: `目標キャラを1体以上引く確率は${pct(chance)}です。確率は保証ではないため、キープ分を残す範囲で回数を決めましょう。`, tone: "violet" };
    return { title: "キープ分を残して試せます", text: `入力した回数なら、回収予定を加味してもキープ目標を維持できます。確率は${pct(chance)}で、当選を保証するものではありません。`, tone: "good" };
  }, [balanceAfter, chance, data.reserve, reserveGap, targetAlreadyOwned]);
  const showSaved = () => { keyboard.hide(); setNotice("入力内容をこの端末に保存しました"); window.setTimeout(() => setNotice(""), 2300); };
  const changeTab = (next: Tab) => { keyboard.hide(); setTab(next); };
  const addEvent = () => { keyboard.hide(); update("events", [...data.events, { id: Date.now(), label: "新しい回収予定", orbs: 0, date: dateAfter(15), source: "" }]); };
  const updateEvent = (id: number, key: "label" | "orbs" | "date" | "source", value: string) => update("events", data.events.map((e) => e.id === id ? { ...e, [key]: key === "orbs" ? Number(value) : value } : e));
  const removeEvent = (id: number) => update("events", data.events.filter((e) => e.id !== id));

  return <MobileScroll className="app-screen">
    <main className="screen-content">
      <header className="topbar">
        <div><p className="eyebrow">UNOFFICIAL FAN TOOL</p><h1>{tab === "odds" ? "ガチャの見通し" : tab === "plan" ? "オーブの回収計画" : "オーブ手帳"}</h1><p className="subhead">モンストのオーブ計画を、納得して。</p></div>
        <div className="orb-mark" aria-hidden="true"><StarFilledIcon /></div>
      </header>

      <section className="balance-strip" aria-label="プレイヤー情報">
        <button className="balance-value" onClick={() => setEditing(!editing)}><span className="orb-dot"><StarFilledIcon /></span> <span>所持</span><strong>{fmt(data.orbs)}</strong><span>個</span><span className="edit-icon"><Pencil1Icon /></span></button>
        <div className="player-meta"><span>ランク <b>{data.rank}</b></span><span>限定 <b>{data.limited}</b>体</span></div>
      </section>
      {editing && <section className="edit-inline" aria-label="プレイヤー情報を編集">
        <label>所持オーブ<KeyboardInput inputMode="numeric" type="number" min="0" value={data.orbs} onChange={(e) => update("orbs", Number(e.target.value))}/></label>
        <label>ランク<KeyboardInput inputMode="numeric" type="number" min="1" value={data.rank} onChange={(e) => update("rank", Number(e.target.value))}/></label>
        <label>限定キャラ数<KeyboardInput inputMode="numeric" type="number" min="0" value={data.limited} onChange={(e) => update("limited", e.target.value)}/></label>
        <label className="wide-field">所持限定キャラ名（、区切り）<KeyboardInput value={data.ownedNames} placeholder="キャラ名を入力（任意）" onChange={(e) => update("ownedNames", e.target.value)}/></label>
          <button className="small-primary" onClick={() => { setEditing(false); showSaved(); }}>保存する</button>
      </section>}

      {tab === "odds" && <>
        <section className="target-section">
          <div className="section-heading"><div><p className="eyebrow">TARGET</p><h2>狙いキャラ</h2></div><span className="micro-note">確率はゲーム内で確認</span></div>
          <label className="field-row"><span className="field-copy"><KeyboardInput aria-label="ほしいキャラの名前" placeholder="ほしいキャラ名を入力" value={data.target} onChange={(e) => update("target", e.target.value)} /><small>提供割合・手入力</small></span><span className="chevron"><ChevronDownIcon /></span></label>
          <label className="rate-row"><span>対象キャラの提供割合</span><span className="rate-input"><KeyboardInput aria-label="提供割合（パーセント）" inputMode="decimal" type="number" min="0" max="100" step="0.01" value={data.rate} onChange={(e) => update("rate", Number(e.target.value))}/><b>%</b></span></label>
        </section>

        <section className="probability-section">
          <div className="section-heading"><div><p className="eyebrow">PROBABILITY</p><h2>{pulls}回で1体以上引ける確率</h2></div><button className="text-button" onClick={() => setNotice("1回ごとの提供割合が一定で独立と仮定した計算です。確定枠・ホシ玉などは含みません。")}>計算条件 <InfoCircledIcon /></button></div>
          <div className="probability-number">{pct(chance)}</div>
          <div className="probability-caption"><span>引けない確率 <b>{pct(1 - chance)}</b></span><span>1回あたり {fmt(cost)}個</span></div>
          <div className="probability-meter" role="img" aria-label={`当選確率 ${pct(chance)}`}><div className="meter-labels"><span>0%</span><span>当選確率</span><span>100%</span></div><div className="meter-track"><div className="meter-fill" style={{ width: `${chance * 100}%` }} /><span className="meter-pin" style={{ left: `${chance * 100}%` }} /></div><p>同じ提供割合で{pulls}回引いた場合</p></div>
          <div className="slider-head"><b>ガチャを引く回数</b><span>1回 = 5個</span></div>
          <div className="slider-control"><button aria-label="1回減らす" onClick={() => update("pulls", Math.max(0, pulls - 1))}><MinusIcon /></button><input aria-label="ガチャ回数" type="range" min="0" max="100" step="1" value={pulls} onChange={(e) => update("pulls", Number(e.target.value))}/><button aria-label="1回増やす" onClick={() => update("pulls", Math.min(100, pulls + 1))}><PlusIcon /></button></div>
          <div className="cost-row"><span>使用予定 <strong>{fmt(cost)}</strong> 個</span><span className="cost-divider"/><span>期限時の残高見込み <strong className={balanceAfter < data.reserve ? "danger-text" : "teal-text"}>{fmt(balanceAfter)}</strong> 個</span></div>
          <div className={`advice-box ${advice.tone}`}><div className="advice-icon">{advice.tone === "warn" ? <InfoCircledIcon /> : <StarFilledIcon />}</div><div><p className="eyebrow">計画アドバイス</p><h3>{advice.title}</h3><p>{advice.text}</p></div></div>
          <button className="primary-button" onClick={() => changeTab("plan")}>貯蓄計画を見る <ChevronRightIcon /></button>
          <p className="disclaimer">非公式ファンツール・確率は目安です。結果や将来の配布を保証しません。</p>
        </section>
      </>}

      {tab === "plan" && <>
        <section className="plan-hero"><p className="eyebrow">YOUR ORB PLAN</p><h2>キープ目標と期限</h2><label className="deadline-field">目標日<KeyboardInput aria-label="目標日" type="date" value={data.deadline} onChange={(e) => update("deadline", e.target.value)}/></label><div className="reserve-input"><KeyboardInput aria-label="キープ目標オーブ" type="number" min="0" value={data.reserve} onChange={(e) => update("reserve", Number(e.target.value))}/><span>個</span><small>キープしたいオーブ数</small></div><div className="forecast-summary"><span>現在 <b>{fmt(data.orbs)}</b></span><span>期限までの予定 <b>+{fmt(future)}</b></span><span>合計見込み <b>{fmt(data.orbs + future)}</b></span></div></section>
        <section className="event-section"><div className="section-heading"><div><p className="eyebrow">MANUAL FORECAST</p><h2>オーブ回収予定</h2></div><span className="micro-note">公式告知で確認して入力</span></div>
          {data.events.length === 0 && <p className="empty-state">回収予定を追加すると、目標までの見通しを計算します。</p>}
          <div className="event-list">{data.events.map((event) => <div className="event-row" key={event.id}><div className="event-fields"><KeyboardInput aria-label="予定名" value={event.label} onChange={(e) => updateEvent(event.id, "label", e.target.value)}/><KeyboardInput aria-label="予定日" type="date" value={event.date} onChange={(e) => updateEvent(event.id, "date", e.target.value)}/><KeyboardInput aria-label="公式告知URL" type="url" placeholder="公式告知URL（任意）" value={event.source} onChange={(e) => updateEvent(event.id, "source", e.target.value)}/>{officialLink(event.source) && <a className="source-link" href={officialLink(event.source)} target="_blank" rel="noreferrer">公式告知を開く <ChevronRightIcon /></a>}</div><label className="event-amount"><span>+ </span><KeyboardInput aria-label="入手予定オーブ" type="number" min="0" value={event.orbs} onChange={(e) => updateEvent(event.id, "orbs", e.target.value)}/><span>個</span></label><button className="remove-button" aria-label={`${event.label}を削除`} onClick={() => removeEvent(event.id)}><Cross2Icon /></button></div>)}</div>
          <button className="add-event" onClick={addEvent}><PlusIcon /> 回収予定を追加</button>
          <div className={`advice-box ${balanceAfter < data.reserve ? "warn" : "good"}`}><div className="advice-icon"><StarFilledIcon /></div><div><p className="eyebrow">計画アドバイス</p><h3>{balanceAfter < data.reserve ? `目標まであと${fmt(reserveGap)}個` : "キープ目標を達成できる見込み"}</h3><p>{balanceAfter < data.reserve ? `引く予定の${pulls}回を含めると、期限までの予定を達成しても${fmt(reserveGap)}個不足します。キープ目標を守るなら最大${fmt(maxSafePulls)}回までが目安です。` : `入力した回収予定を達成すれば、期限まであと${daysLeft}日でキープ目標を維持できる見込みです。未確定の配布は予定に含めないのがおすすめです。`}</p></div></div>
          <button className="primary-button" onClick={showSaved}>この計画を保存 <CheckIcon /></button><p className="disclaimer">回収数・日付は入力例です。公式告知やゲーム内報酬を確認して更新してください。</p>
        </section>
      </>}

      {tab === "balance" && <>
        <section className="balance-hero"><p className="eyebrow">CURRENT BALANCE</p><h2>現在のオーブ</h2><div className="balance-big">{fmt(data.orbs)}<small>個</small></div><button className="primary-button" onClick={() => setEditing(!editing)}>残高・プレイヤー情報を編集 <Pencil1Icon /></button></section>
        {editing && <section className="edit-inline"><label>所持オーブ<KeyboardInput inputMode="numeric" type="number" min="0" value={data.orbs} onChange={(e) => update("orbs", Number(e.target.value))}/></label><label>ランク<KeyboardInput inputMode="numeric" type="number" min="1" value={data.rank} onChange={(e) => update("rank", Number(e.target.value))}/></label><label>限定キャラ数<KeyboardInput inputMode="numeric" type="number" min="0" value={data.limited} onChange={(e) => update("limited", e.target.value)}/></label><label className="wide-field">所持限定キャラ名（、区切り）<KeyboardInput value={data.ownedNames} placeholder="キャラ名を入力（任意）" onChange={(e) => update("ownedNames", e.target.value)}/></label><button className="small-primary" onClick={() => { setEditing(false); showSaved(); }}>保存する</button></section>}
        <section className="owned-section"><div className="section-heading"><div><p className="eyebrow">PLAYER PROFILE</p><h2>プレイヤー情報</h2></div></div><div className="profile-row"><span>ランク</span><b>{data.rank}</b></div><div className="profile-row"><span>所持限定キャラ数</span><b>{data.limited}体</b></div><p className="disclaimer">プレイヤー情報はこの端末に保存されます。アカウント連携やゲームデータの読み取りは行いません。</p></section>
      </>}

      <nav className="bottom-tabs" aria-label="メインメニュー">
        <button className={tab === "balance" ? "selected" : ""} onClick={() => changeTab("balance")}><ArchiveIcon />残高</button>
        <button className={tab === "plan" ? "selected" : ""} onClick={() => changeTab("plan")}><CalendarIcon />計画</button>
        <button className={tab === "odds" ? "selected" : ""} onClick={() => changeTab("odds")}><BarChartIcon />確率</button>
      </nav>
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  </MobileScroll>;
}
