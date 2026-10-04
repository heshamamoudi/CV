import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import type { HomeData } from "../types";
import { useStrings } from "../i18n/useStrings";
import { ContactForm } from "../components/ContactForm";
import { JourneyExplorer } from "../components/JourneyExplorer";
import { useChapterTransition } from "../components/useChapterTransition";

const Sculpture=lazy(()=>import("../components/Sculpture").then(m=>({default:m.Sculpture})));
export const chapters=["intro","work","journey","about","contact"];

export function HomePage({home}:{home:HomeData}){
  const ar=home.lang==="ar",t=useStrings(home.lang),p=home.profile,copy=(en:string,arabic:string)=>ar?arabic:en;
  const location=useLocation(),navigate=useNavigate(),selected=chapters.indexOf(location.hash.slice(1)),requestedChapter=selected<0?0:selected;
  const chapterRef=useRef(requestedChapter);chapterRef.current=requestedChapter;
  const [paused,setPaused]=useState(()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches);
  const {chapter,phase}=useChapterTransition(requestedChapter,paused);
  const [projectIndex,setProjectIndex]=useState(()=>Math.max(0,home.projects.findIndex(item=>item.slug===home.featuredProject?.slug)));
  const [roleIndex,setRoleIndex]=useState(0),[aboutTab,setAboutTab]=useState(0);
  const project=home.projects[Math.min(projectIndex,home.projects.length-1)];
  const labels=[copy("Introduction","المقدمة"),copy("Selected work","الأعمال"),copy("The journey","المسيرة"),copy("The person","نبذة"),copy("Let’s talk","لنتحدث")];
  const go=useCallback((n:number)=>{const next=Math.max(0,Math.min(4,n));if(next===chapterRef.current)return;navigate({pathname:location.pathname,hash:next===0?"":`#${chapters[next]}`},{replace:true,preventScrollReset:true})},[navigate,location.pathname]);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)"),change=()=>setPaused(media.matches);media.addEventListener("change",change);return()=>media.removeEventListener("change",change)},[]);
  useEffect(()=>{
    let lastWheel=0,amount=0,consumed=false,lastTransition=0,touchY=0,touchX=0,touchCanUp=false,touchCanDown=false;
    const canScroll=(target:EventTarget|null,delta:number)=>{
      if(target instanceof Element&&target.closest("[data-contact-form]"))return true;
      let region=target instanceof Element?target.closest<HTMLElement>("[data-scroll-region]"):null;
      while(region){if(delta>0?region.scrollTop+region.clientHeight<region.scrollHeight-2:region.scrollTop>2)return true;region=region.parentElement?.closest<HTMLElement>("[data-scroll-region]")??null}
      return false;
    };
    const wheel=(e:WheelEvent)=>{if(e.ctrlKey||document.querySelector("[data-splash]"))return;if(canScroll(e.target,e.deltaY))return;e.preventDefault();const now=performance.now();if(now-lastWheel>180){amount=0;consumed=false}lastWheel=now;amount+=e.deltaY*(e.deltaMode===1?16:1);if(consumed||now-lastTransition<850||Math.abs(amount)<55)return;consumed=true;lastTransition=now;go(chapterRef.current+Math.sign(amount))};
    const key=(e:KeyboardEvent)=>{if(document.querySelector("[data-splash]")||e.altKey||e.ctrlKey||e.metaKey)return;if(e.target instanceof Element&&e.target.closest("button,a,input,textarea,select,[contenteditable=true]"))return;const direction=["ArrowDown","PageDown"," "].includes(e.key)?1:["ArrowUp","PageUp"].includes(e.key)?-1:0;if(direction&&!canScroll(e.target,direction)){e.preventDefault();go(chapterRef.current+direction)}else if(e.key==="Home"){e.preventDefault();go(0)}else if(e.key==="End"){e.preventDefault();go(4)}};
    const start=(e:TouchEvent)=>{touchY=e.touches[0].clientY;touchX=e.touches[0].clientX;touchCanUp=canScroll(e.target,-1);touchCanDown=canScroll(e.target,1)};
    const end=(e:TouchEvent)=>{if(document.querySelector("[data-splash]")||e.target instanceof Element&&e.target.closest("[data-contact-form]"))return;const dy=touchY-e.changedTouches[0].clientY,dx=touchX-e.changedTouches[0].clientX;if(Math.abs(dy)>65&&Math.abs(dy)>Math.abs(dx)&&!(dy>0?touchCanDown:touchCanUp))go(chapterRef.current+Math.sign(dy))};
    window.addEventListener("wheel",wheel,{passive:false});window.addEventListener("keydown",key);window.addEventListener("touchstart",start,{passive:true});window.addEventListener("touchend",end,{passive:true});
    return()=>{window.removeEventListener("wheel",wheel);window.removeEventListener("keydown",key);window.removeEventListener("touchstart",start);window.removeEventListener("touchend",end)}
  },[go]);
  useEffect(()=>{document.documentElement.dataset.chapter=String(chapter);return()=>{delete document.documentElement.dataset.chapter}},[chapter]);
  return <div className={`experience chapter-${chapter}${paused?" motion-paused":""}`} data-transition={phase}>
    <Suspense fallback={null}><Sculpture chapter={chapter} paused={paused} journey={home.journey} selectedJourneyIndex={roleIndex} selectedProjectIndex={projectIndex} aboutTab={aboutTab}/></Suspense>
    <section className="chapter-panel" data-phase={phase} data-scroll-region key={chapter} aria-label={labels[chapter]} aria-busy={phase!=="idle"}>
      {chapter===0&&<div className="intro-content chapter-grid">
        <div className="intro-copy"><p className="section-kicker">{p.eyebrow}</p><p className="intro-identity">{p.name} <span>/</span> {p.headline}</p>
          <h1 className="hero-name"><span className="sr-only">{p.name}. </span>{p.heroTitle}</h1>
          <p className="hero-subtitle">{p.heroSubtitle}</p>
          <div className="intro-actions"><button className="round-link" onClick={()=>go(1)}><span>{t("hero.explore")}</span><i aria-hidden="true">↗</i></button><button className="intro-secondary" onClick={()=>go(2)}>{t("nav.journey")} ↗</button></div>
          {home.journey[0]&&<p className="intro-proof"><span>{home.journey[0].organisation}</span>{home.journey[0].highlights[0]}</p>}
        </div><div className="intro-stage scene-stage" data-scene-anchor aria-hidden="true"/><p className="scene-caption">{p.location}</p>
      </div>}
      {chapter===1&&<div className="work-content">
        <p className="section-kicker">01 / {t("section.project")}</p><h2 className="chapter-title">{copy("Selected work.","أعمال مختارة.")}</h2>
        <div className="work-layout"><div className="work-information">
          <div className="project-picker" aria-label={t("page.projects")}>{home.projects.map((item,i)=><button key={item.slug} className={i===projectIndex?"chosen":""} onClick={()=>setProjectIndex(i)} aria-pressed={i===projectIndex}><span>{String(i+1).padStart(2,"0")}</span><strong>{item.title}</strong><b aria-hidden="true">↗</b></button>)}</div>
          {project&&<div className="project-spotlight" key={project.slug}><span className="micro-label">{copy("PROJECT","مشروع")} / {String(projectIndex+1).padStart(2,"0")}</span><p>{project.summary}</p><div className="project-tags">{project.technologies.slice(0,4).map(item=><span key={item}>{item}</span>)}</div><Link className="text-link" to={`/${home.lang}/projects/${project.slug}`}>{copy("Explore the project","استكشف المشروع")} ↗</Link></div>}
          <Link className="all-work" to={`/${home.lang}/projects`}>{copy("View all projects","جميع المشاريع")} ↗</Link>
        </div><div className="work-visual"><div className="work-stage scene-stage" data-scene-anchor aria-hidden="true"/>{project?.cover&&<figure className="work-figure" key={project.slug}><img className="work-cover" src={project.cover.src} srcSet={project.cover.srcSet} sizes="(max-width: 700px) 90vw, 54vw" width={project.cover.width} height={project.cover.height} alt={project.cover.alt}/><figcaption className="work-caption"><span>{project.cover.alt}</span><span dir="ltr">{project.liveUrl?new URL(project.liveUrl).hostname:project.title}</span></figcaption></figure>}</div></div>
      </div>}
      {chapter===2&&<div className="journey-content"><p className="section-kicker">02 / {t("section.journey")}</p><h2 className="chapter-title">{copy("The journey.","المسيرة.")}</h2><p className="journey-subtitle">{copy("New challenges. Greater responsibility. The same curiosity.","تحديات جديدة. مسؤولية أكبر. والفضول ذاته.")}</p><JourneyExplorer journey={home.journey} lang={home.lang} initialIndex={roleIndex} onActive={setRoleIndex}/></div>}
      {chapter===3&&<div className="about-content chapter-grid"><div className="about-copy"><p className="section-kicker">03 / {t("section.about")}</p><h2 className="chapter-title">{copy("Human first. Engineer always.","الإنسان أولاً. مهندس دائماً.")}</h2>
        <div className="about-tabs" aria-label={t("section.about")}>{[copy("Perspective","الرؤية"),t("section.tech"),copy("Background","الخلفية")].map((label,i)=><button key={label} className={aboutTab===i?"chosen":""} aria-pressed={aboutTab===i} onClick={()=>setAboutTab(i)}>{label}</button>)}</div>
        <div className="about-body" key={aboutTab}>{aboutTab===0&&<>{p.portrait&&<img className="profile-portrait" src={p.portrait.src} srcSet={p.portrait.srcSet} sizes="120px" width={p.portrait.width} height={p.portrait.height} alt={p.portrait.alt}/>}<p className="about-lead">{p.about}</p>{p.quote&&<blockquote>“{p.quote}”</blockquote>}<p className="profile-summary">{p.summary}</p></>}
          {aboutTab===1&&<div className="technology-groups">{home.technologies.map(group=><div key={group.category}><h3>{group.category}</h3><div>{group.items.map(item=><span key={item}>{item}</span>)}</div></div>)}</div>}
          {aboutTab===2&&<div className="credentials"><h3>{t("section.certificates")}</h3>{home.certificates.map(c=><p key={c.title}>{c.title} — {c.issuer}{c.issuedOn&&<time dateTime={c.issuedOn}>{c.issuedOn}</time>}</p>)}<h3>{t("section.education")}</h3>{home.education.map(e=><p key={e.degree}>{e.degree} — {e.institution}</p>)}<h3>{t("section.languages")}</h3>{home.languages.map(l=><p key={l.name}>{l.name} — {l.level}</p>)}</div>}
        </div></div><div className="about-stage scene-stage" data-scene-anchor aria-hidden="true"/></div>}
      {chapter===4&&<div className="contact-content"><div className="contact-intro"><p className="section-kicker">04 / {t("section.contact")}</p><h2 className="contact-title">{copy("Let’s start a conversation.","لنتحدث عن فكرتك.")}</h2><p className="contact-lead">{copy("Have a project or an idea in mind? Send a note and I’ll get back to you.","هل لديك مشروع أو فكرة؟ أرسل رسالة وسأعود إليك.")}</p><a className="contact-email" href={`mailto:${p.email}`} dir="ltr">{p.email}</a><div className="social-links">{home.hasCv&&<a href={`/${home.lang}/cv`}>{t("hero.cv")} ↓</a>}{p.linkedInUrl&&<a href={p.linkedInUrl} rel="me noopener noreferrer" target="_blank">LinkedIn ↗</a>}{p.gitHubUrl&&<a href={p.gitHubUrl} rel="me noopener noreferrer" target="_blank">GitHub ↗</a>}</div><div className="contact-stage scene-stage" data-scene-anchor aria-hidden="true"/></div><ContactForm lang={home.lang}/></div>}
    </section>
    <footer className="stage-footer"><div className="chapter-name"><b>{String(chapter+1).padStart(2,"0")}</b><span>/ 05</span><span className="current-label">{labels[chapter]}</span><button className="motion-toggle" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?copy("Play motion","تشغيل الحركة"):copy("Pause motion","إيقاف الحركة")}</button></div>
      <nav className="chapter-progress" aria-label={copy("Choose a chapter","اختر فصلاً")}>{labels.map((label,i)=><button key={label} onClick={()=>go(i)} aria-current={i===chapter?"step":undefined} aria-label={`${String(i+1).padStart(2,"0")} ${label}`}/>)}</nav>
      <div className="stage-controls"><button onClick={()=>go(chapter-1)} disabled={chapter===0} aria-label={copy("Previous chapter","الفصل السابق")}>↑</button><button onClick={()=>go(chapter+1)} disabled={chapter===4} aria-label={copy("Next chapter","الفصل التالي")}>↓</button></div></footer>
    <div className="sr-only" aria-live="polite">{labels[chapter]}</div>
  </div>;
}
