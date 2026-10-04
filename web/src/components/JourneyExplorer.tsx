import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { JourneyDto, Lang } from "../types";
import { useStrings } from "../i18n/useStrings";
import { formatMonthYear } from "../date";

export function JourneyExplorer({journey,lang,onActive,archive=false,initialIndex=0}:{journey:JourneyDto[];lang:Lang;onActive:(index:number)=>void;archive?:boolean;initialIndex?:number}) {
  const initialPinned=journey.length?Math.max(0,Math.min(initialIndex,journey.length-1)):0;
  const [pinned,setPinned]=useState(initialPinned);
  const boundedPinned=journey.length?Math.min(pinned,journey.length-1):0;
  const entry=journey[boundedPinned],ar=lang==="ar",t=useStrings(lang);
  useEffect(()=>{
    if(pinned!==boundedPinned)setPinned(boundedPinned);
    onActive(boundedPinned);
  },[boundedPinned,journey.length,onActive,pinned]);
  return <div className={`journey-explorer${archive?" journey-explorer-archive":""}`}>
    <div className="journey-atlas">
      <div className="atlas-heading"><span>{ar?"خريطة المسيرة":"CAREER ATLAS"}</span><span>{String(journey.length).padStart(2,"0")} / {ar?"محطات":"STATIONS"}</span></div>
      <div className="journey-stage" data-scene-anchor aria-hidden="true">
        {journey.map((role,i)=><span key={role.id} data-route-station={i} className={`atlas-station${boundedPinned===i?" selected":""}`}><b>{String(journey.length-i).padStart(2,"0")}</b><small>{role.start.slice(0,4)}</small></span>)}
      </div>
      <p className="atlas-caption"><span>{ar?"كل محطة تبني ما بعدها.":"Each chapter builds the next."}</span><span>{ar?"اختر محطة أدناه":"Select a station below"} ↓</span></p>
    </div>
    <div className="journey-roles" data-scroll-region aria-label={t("section.journey")}>
      {[...journey.entries()].reverse().map(([i,role])=><button key={role.id} className={`journey-role${boundedPinned===i?" active pinned":""}`} onClick={()=>setPinned(i)} aria-pressed={boundedPinned===i} aria-label={`${role.start.slice(0,4)} ${role.title} ${role.organisation}`}>
        <span className="journey-station-number" aria-hidden="true">{String(journey.length-i).padStart(2,"0")}</span>
        <time dateTime={role.start}>{role.start.slice(0,4)}</time>
        <span><strong>{role.title}</strong><small>{role.organisation}</small></span>
        {role.kind==="additional"&&<b>{ar?"إضافية":"Additional"}</b>}
      </button>)}
    </div>
    {entry&&<article className="journey-detail" data-scroll-region key={entry.id}>
      <p className="journey-detail-index">{ar?"محطة":"STATION"} {String(journey.length-boundedPinned).padStart(2,"0")} <span>/ {String(journey.length).padStart(2,"0")}</span></p>
      <p className="micro-label"><time dateTime={entry.start}>{formatMonthYear(entry.start,lang)}</time> — {entry.end?<time dateTime={entry.end}>{formatMonthYear(entry.end,lang)}</time>:t("journey.present")}</p>
      <h3>{entry.title}</h3><p className="career-org">{entry.organisation}</p>
      {entry.summary&&<p>{entry.summary}</p>}
      <ul>{(archive?entry.highlights:entry.highlights.slice(0,3)).map(h=><li key={h}>{h}</li>)}</ul>
      {!archive&&<Link className="text-link" to={`/${lang}/journey`}>{ar?"المسيرة الكاملة":"The complete journey"} ↗</Link>}
    </article>}
  </div>;
}
