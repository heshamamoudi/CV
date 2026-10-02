import { useState } from "react";
import type { HomeData } from "../types";
import { ArchiveFrame } from "../components/ArchiveFrame";
import { JourneyExplorer } from "../components/JourneyExplorer";

export function JourneyPage({home}:{home:HomeData}){
  const ar=home.lang==="ar",[active,setActive]=useState(0);
  return <ArchiveFrame chapter={2} selectedJourneyIndex={active} label={ar?"المسيرة الكاملة":"THE COMPLETE JOURNEY"}>
    <div className="career-archive-heading"><p className="section-kicker">{ar?"الخبرة / القيادة / النمو":"EXPERIENCE / LEADERSHIP / GROWTH"}</p><h1>{ar?"المسيرة الكاملة.":"The complete journey."}</h1></div>
    <div className="career-archive-layout"><JourneyExplorer journey={home.journey} lang={home.lang} onActive={setActive} archive/></div>
  </ArchiveFrame>;
}
