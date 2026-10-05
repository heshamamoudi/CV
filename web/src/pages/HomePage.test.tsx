import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HomePage } from "./HomePage";
import type { HomeData } from "../types";

vi.mock("../components/Sculpture", () => ({ Sculpture: ({ selectedJourneyIndex, selectedProjectSlug }: { selectedJourneyIndex: number; selectedProjectSlug?:string }) => <div data-testid="sculpture" data-role-index={selectedJourneyIndex} data-project={selectedProjectSlug} /> }));

const home: HomeData = {
  lang: "ar",
  profile: {
    name: "هشام العمودي",
    headline: "قائد تطوير التطبيقات",
    eyebrow: "e",
    heroTitle: "h",
    heroSubtitle: "s",
    summary: "ملخص",
    location: "الرياض",
    about: "نبذة",
    quote: "q",
    email: "a@b.c",
    linkedInUrl: "https://l",
    gitHubUrl: "https://g",
  },
  journey: [
    {
      id: 1,
      title: "قائد تطوير التطبيقات",
      organisation: "شركة التنفيذي",
      summary: "",
      highlights: ["قيادة"],
      start: "2025-07",
      end: null,
      kind: "main",
      seniority: 5,
    },
  ],
  featuredProject: null,
  projects: [],
  technologies: [{ category: "قواعد البيانات", items: ["PostgreSQL"] }],
  certificates: [
    { title: "مطور JavaScript متكامل", issuer: "Udacity", issuedOn: "2022-09" },
  ],
  education: [
    {
      degree: "بكالوريوس تقنية المعلومات",
      institution: "جامعة الملك عبدالعزيز",
    },
  ],
  languages: [{ name: "العربية", level: "اللغة الأم" }],
  updatedAt: "2026-09-15T00:00:00Z",
};

const click = (element: Element) => { fireEvent.click(element); act(() => vi.advanceTimersByTime(160)); };
const keyDown = (element: Window, event: object) => { fireEvent.keyDown(element, event); act(() => vi.advanceTimersByTime(160)); };

describe("HomePage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('updates the primary image, accessible diagram and morph target together on project selection', async () => {
    const projects=['selfhost-platform','inviteqr'].map((slug,i)=>({slug,title:i?'InviteQR':'Selfhost',summary:'Project summary',body:'',technologies:[],featured:i===0,availableInOtherLanguage:true,cover:{src:`/${slug}.webp`,srcSet:'',width:1280,height:720,alt:i?'Guest list':'Service dashboard'}}));
    render(<MemoryRouter initialEntries={['/en#work']}><HomePage home={{...home,lang:'en',projects}} /></MemoryRouter>);
    await act(async()=>{});
    expect(screen.getByRole('img',{name:'Service dashboard'})).toHaveAttribute('src','/selfhost-platform.webp');
    expect(screen.getByTestId('sculpture')).toHaveAttribute('data-project','selfhost-platform');
    expect(screen.getByRole('img',{name:'Deployment, service monitoring and recovery.'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/02 InviteQR/}));
    expect(screen.getByRole('img',{name:'Guest list'})).toHaveAttribute('src','/inviteqr.webp');
    expect(screen.getByTestId('sculpture')).toHaveAttribute('data-project','inviteqr');
    const diagram=screen.getByRole('img',{name:'Invitation, guest management and check-in workflow.'});
    expect(screen.getByRole('img',{name:'Guest list'}).closest('figure')!.compareDocumentPosition(diagram)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('renders the profile fields edited in admin and exposes only an available CV', () => {
    const { rerender } = render(<MemoryRouter initialEntries={['/ar']}><HomePage home={home} /></MemoryRouter>);
    expect(screen.getByText(home.profile.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(home.profile.heroTitle)).toBeInTheDocument();
    click(screen.getByRole('button', { name: '05 لنتحدث' }));
    expect(screen.queryByRole('link', { name: /تحميل السيرة/ })).not.toBeInTheDocument();
    rerender(<MemoryRouter initialEntries={['/ar']}><HomePage home={{ ...home, hasCv: true }} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /تحميل السيرة/ })).toHaveAttribute('href', '/ar/cv');
  });

  it("navigates between chapters while keeping profile, journey and technology content reachable", () => {
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("هشام");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "العمودي",
    );
    click(screen.getByRole("button", { name: "03 المسيرة" }));
    expect(
      screen.getByRole("heading", { name: "قائد تطوير التطبيقات" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/حتى الآن/)).toBeInTheDocument();
    click(screen.getByRole("button", { name: "04 نبذة" }));
    click(screen.getByRole("button", { name: "التقنيات" }));
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("keeps the certificates, education and languages the server rendered", () => {
    render(
      <MemoryRouter initialEntries={["/ar#about"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );
    click(screen.getByRole("button", { name: "الخلفية" }));

    expect(
      screen.getByText("مطور JavaScript متكامل — Udacity"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("بكالوريوس تقنية المعلومات — جامعة الملك عبدالعزيز"),
    ).toBeInTheDocument();
    expect(screen.getByText("العربية — اللغة الأم")).toBeInTheDocument();
  });

  it("does not render a link the server blanked", () => {
    render(
      <MemoryRouter initialEntries={["/ar#contact"]}>
        <HomePage
          home={{ ...home, profile: { ...home.profile, linkedInUrl: "" } }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("link", { name: /LinkedIn/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GitHub/ })).toBeInTheDocument();
  });

  it("supports keyboard chapter navigation and pauses motion", () => {
    render(
      <MemoryRouter initialEntries={["/ar"]}>
        <HomePage home={home} />
      </MemoryRouter>,
    );
    keyDown(window, { key: "End" });
    expect(screen.getByRole("link", { name: /a@b.c/ })).toHaveAttribute(
      "href",
      "mailto:a@b.c",
    );
    click(screen.getByRole("button", { name: /إيقاف الحركة/ }));
    expect(
      screen.getByRole("button", { name: /تشغيل الحركة/ }),
    ).toHaveAttribute("aria-pressed", "true");
    keyDown(window, { key: "Home" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("هشام");
  });

  it('changes a career role only on click, not on hover or focus', async () => {
    const second = { ...home.journey[0], id: 2, title: 'Second role', organisation: 'Second company', start: '2023-04', highlights: ['Second highlight'] };
    render(<MemoryRouter initialEntries={['/ar#journey']}><HomePage home={{ ...home, journey: [home.journey[0], second] }} /></MemoryRouter>);
    const role = screen.getByRole('button', { name: /2023 Second role Second company/ });
    expect(screen.getByRole('heading', { name: home.journey[0].title })).toBeInTheDocument();
    fireEvent.mouseEnter(role);
    expect(screen.getByRole('heading', { name: home.journey[0].title })).toBeInTheDocument();
    fireEvent.mouseLeave(role);
    fireEvent.focus(role);
    expect(screen.getByRole('heading', { name: home.journey[0].title })).toBeInTheDocument();
    click(role);
    expect(role).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Second role' })).toBeInTheDocument();
  });

  it("keeps the selected journey role aligned with the sculpture after leaving and returning", () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
      { ...home.journey[0], id: 3, title: "Third role", organisation: "Third company", start: "2022-04" },
    ];
    const { container } = render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
    const chapters = container.querySelectorAll(".chapter-progress button");
    expect(container.querySelector(".journey-roles")).toHaveAttribute("data-scroll-region");
    expect(container.querySelector(".journey-detail")).toHaveAttribute("data-scroll-region");
    click(screen.getByRole("button", { name: /2022 Third role Third company/ }));
    expect(screen.getByRole("heading", { name: "Third role" })).toBeInTheDocument();
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "2");

    click(chapters[3]);
    click(chapters[2]);
    expect(screen.getByRole("heading", { name: "Third role" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2022 Third role Third company/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "2");
  });

  it("does not let pointer movement override the role selected by click", async () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
    ];
    render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
    const first = screen.getByRole("button", { name: /2025 First role First company/ });
    const second = screen.getByRole("button", { name: /2023 Second role Second company/ });
    fireEvent.mouseEnter(second);
    click(first);
    fireEvent.mouseEnter(second);

    expect(screen.getByRole("heading", { name: "First role" })).toBeInTheDocument();
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "0");
  });

  it("clamps the clicked selection when the journey list shrinks", () => {
    const journey = [
      { ...home.journey[0], id: 1, title: "First role", organisation: "First company" },
      { ...home.journey[0], id: 2, title: "Second role", organisation: "Second company", start: "2023-04" },
      { ...home.journey[0], id: 3, title: "Third role", organisation: "Third company", start: "2022-04" },
    ];
    const { rerender } = render(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey }} /></MemoryRouter>);
    click(screen.getByRole("button", { name: /2022 Third role Third company/ }));
    rerender(<MemoryRouter initialEntries={["/ar#journey"]}><HomePage home={{ ...home, journey: journey.slice(0, 2) }} /></MemoryRouter>);

    expect(screen.queryByRole("button", { name: /Third role/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("sculpture")).toHaveAttribute("data-role-index", "1");
    expect(screen.getByRole("heading", { name: "Second role" })).toBeInTheDocument();
  });
});
