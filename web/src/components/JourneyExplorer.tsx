import { useState } from "react";
import { Link } from "react-router";
import type { JourneyDto, Lang } from "../types";
import { useStrings } from "../i18n/useStrings";
import { formatMonthYear } from "../date";

export function JourneyExplorer({journey,lang,onActive,archive=false}:{journey:JourneyDto[];lang:Lang;onActive:(index:number)=>void;archive?:boolean}) {
  const [pinned,setPinned]=useState(0),[preview,setPreview]=useState<number|null>(null);
  const [hoverTimer,setHoverTimer]=useState<ReturnType<typeof setTimeout>|null>(null);
  const active=preview??pinned,entry=journey[active],ar=lang==="ar",t=useStrings(lang);
  const clear=()=>{if(hoverTimer)clearTimeout(hoverTimer);setHoverTimer(null);setPreview(null);onActive(pinned)};
  const show=(i:number,delay=false)=>{if(hoverTimer)clearTimeout(hoverTimer);if(delay)setHoverTimer(setTimeout(()=>{setPreview(i);onActive(i)},90));else {setPreview(i);onActive(i)}};
  return <div className={`journey-explorer${archive?" journey-explorer-archive":""}`} onMouseLeave={clear} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))clear()}}>
    <div className="journey-roles" aria-label={t("section.journey")}>
      {journey.map((role,i)=><button key={role.id} className={`journey-role${active===i?" active":""}${pinned===i?" pinned":""}`} onMouseEnter={()=>show(i,true)} onFocus={()=>show(i)} onClick={()=>{setPinned(i);setPreview(null);onActive(i)}} aria-pressed={pinned===i} aria-label={`${role.start.slice(0,4)} ${role.title} ${role.organisation}`}>
        <time dateTime={role.start}>{role.start.slice(0,4)}</time>
        <span><strong>{role.title}</strong><small>{role.organisation}</small></span>
        {role.kind==="additional"&&<b>{ar?"إضافية":"Additional"}</b>}
      </button>)}
    </div>
    <div className="journey-stage" data-scene-anchor aria-hidden="true" />
    {entry&&<article className="journey-detail" key={entry.id}>
      <p className="micro-label"><time dateTime={entry.start}>{formatMonthYear(entry.start,lang)}</time> — {entry.end?<time dateTime={entry.end}>{formatMonthYear(entry.end,lang)}</time>:t("journey.present")}{preview!==null&&<span className="preview-label">{ar?"معاينة":"Preview"}</span>}</p>
      <h3>{entry.title}</h3><p className="career-org">{entry.organisation}</p>
      {entry.summary&&<p>{entry.summary}</p>}
      <ul>{(archive?entry.highlights:entry.highlights.slice(0,3)).map(h=><li key={h}>{h}</li>)}</ul>
      {!archive&&<Link className="text-link" to={`/${lang}/journey`}>{ar?"المسيرة الكاملة":"The complete journey"} ↗</Link>}
    </article>}
  </div>;
}
