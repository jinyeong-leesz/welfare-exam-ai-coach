import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  FileText,
  Flame,
  Home as HomeIcon,
  Landmark,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import rawBank from "@/data/bank.json";
import { trpc } from "@/lib/trpc";

type Exam = "사회복지사1급" | "지방9급";
type View = "home" | "quiz" | "wrong" | "stats" | "flash" | "weekly";
type Mode = "오늘의 10문제" | "랜덤 20" | "오답 재시험" | "취약과목" | "100문항 실전모의" | string;

type Question = {
  id: number;
  exam: Exam;
  subject: string;
  q: string;
  choices: string[];
  answer: number;
  explain: string;
  keyword: string;
  era?: string;
  trainingYear?: number;
};

type Attempt = {
  attempts: number;
  correct: number;
  wrong: number;
  lastAnswered: string;
  dueAt: string;
};

type ProgressState = {
  totalAnswered: number;
  totalCorrect: number;
  byQuestion: Record<string, Attempt>;
  history: AnswerHistory[];
};

type AnswerHistory = {
  questionId: number;
  exam: Exam;
  subject: string;
  keyword: string;
  correct: boolean;
  date: string;
  pastYear?: number;
};

type AIExplanation = {
  summary: string;
  whyCorrect: string;
  choiceExplanations: string[];
  relatedConcepts: { title: string; explanation: string }[];
  memoryTip: string;
  nextSteps: string[];
};

type AIConceptExplanation = {
  oneLine: string;
  easyExplanation: string;
  example: string;
  distinction: string;
  memoryTip: string;
  checkPoints: string[];
};

const BANK = (rawBank as Omit<Question, "id">[]).map((question, id) => ({ ...question, id }));
const STORAGE_KEY = "welfare-exam-ai-coach-progress-v2";
const EXAM_LABEL: Record<Exam, { short: string; title: string; description: string; icon: typeof BookOpen }> = {
  사회복지사1급: {
    short: "사회복지사 1급",
    title: "사회복지사 1급",
    description: "기초 개념부터 법제까지, 8개 영역을 탄탄하게",
    icon: BookOpen,
  },
  지방9급: {
    short: "지방직 9급",
    title: "지방직 9급",
    description: "국어·영어·복지학·행정법을 실전 감각으로",
    icon: Landmark,
  },
};

type ConceptItem = { title: string; years: string; subject: string; keys: string[]; theory: string };
type TrendItem = { rank: number; title: string; years: string; subject: string; keys: string[]; desc: string };

const CONCEPT_TOP: ConceptItem[] = [
  { title: "환경 속의 인간", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["환경 속의 인간", "생태도"], theory: "개인의 문제를 개인 내부뿐 아니라 가족·조직·지역사회와의 상호작용 속에서 본다." },
  { title: "사례관리 원칙", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["사례관리", "접근성", "연속성", "포괄성"], theory: "접근성·연속성·포괄성·개별성·책임성 등 원칙을 사례에 적용해 구분한다." },
  { title: "해결중심모델 질문", years: "2024·2025", subject: "사회복지학개론", keys: ["해결중심", "예외질문", "기적질문", "대처질문", "척도질문"], theory: "예외·기적·대처·척도질문의 목적과 질문 문장을 구분한다." },
  { title: "인지행동모델 인지오류", years: "2024·2025", subject: "사회복지학개론", keys: ["과잉일반화", "독심술", "인지"], theory: "사례 문장에서 왜곡된 사고방식을 찾아 과잉일반화·독심술 등을 구분한다." },
  { title: "로스만 3모델", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["로스만", "지역사회개발", "사회계획", "사회행동"], theory: "지역사회개발=참여, 사회계획=전문가, 사회행동=권력·자원 불평등 개선으로 기억한다." },
  { title: "브래드쇼 욕구", years: "2024·2025", subject: "사회복지학개론", keys: ["브래드쇼", "규범적 욕구", "표현된 욕구", "인지적 욕구"], theory: "규범적·인지적·표현된·비교욕구를 기준과 행동 여부로 구분한다." },
  { title: "잔여적 vs 제도적 복지", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["잔여적", "제도적", "복지모형"], theory: "잔여적은 가족·시장 실패 시 보충, 제도적은 사회복지를 지속적 제도로 본다." },
  { title: "에스핑-안데르센", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["에스핑", "탈상품화", "사회민주주의"], theory: "복지체제는 탈상품화·계층화·국가·시장·가족 역할 차이로 구분한다." },
  { title: "사회보험 vs 공공부조", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["사회보험", "공공부조", "사회보장"], theory: "사회보험은 기여 기반 위험대응, 공공부조는 조세 기반 최저생활 보장이 핵심이다." },
  { title: "수직·수평 재분배", years: "2024·2025", subject: "사회복지학개론", keys: ["수직적 재분배", "수평적 재분배", "재분배"], theory: "고소득→저소득은 수직, 비슷한 소득계층 내 위험 이전은 수평 재분배다." },
  { title: "정책 효과성·효율성", years: "2024·2025", subject: "사회복지학개론", keys: ["효과성", "효율성", "정책"], theory: "효과성은 목표 달성, 효율성은 투입 대비 산출·성과를 뜻한다." },
  { title: "제1종·제2종 오류", years: "2024·2025", subject: "사회복지학개론", keys: ["제1종 오류", "제2종 오류", "조사"], theory: "1종=없는 효과를 있다고, 2종=있는 효과를 없다고 판단하는 오류다." },
  { title: "행정법 법률우위·유보", years: "2024·2025·2026", subject: "행정법총론", keys: ["법률우위원칙", "법률유보원칙", "법치행정"], theory: "법률우위는 법 위반 금지, 법률유보는 중요한 행정작용에 법률 근거가 필요하다는 뜻이다." },
  { title: "비례·신뢰보호원칙", years: "2024·2025·2026", subject: "행정법총론", keys: ["비례원칙", "신뢰보호원칙", "일반원칙"], theory: "비례는 목적-수단의 균형, 신뢰보호는 정당한 신뢰를 보호한다." },
  { title: "공정력·불가쟁력", years: "2024·2025·2026", subject: "행정법총론", keys: ["공정력", "불가쟁력", "행정행위"], theory: "공정력은 취소 전 유효 통용, 불가쟁력은 쟁송기간 경과 후 다투기 어려운 효력이다." },
  { title: "취소·철회·무효", years: "2024·2025·2026", subject: "행정법총론", keys: ["취소", "철회", "무효", "하자"], theory: "취소는 성립 당시 하자, 철회는 후발사유, 중대·명백한 하자는 무효가 원칙이다." },
  { title: "기속행위·재량행위", years: "2024·2025·2026", subject: "행정법총론", keys: ["기속행위", "재량", "일탈", "남용"], theory: "기속은 선택 여지가 적고, 재량은 일탈·남용 여부가 사법심사 대상이다." },
  { title: "취소소송 핵심", years: "2024·2025·2026", subject: "행정법총론", keys: ["취소소송", "원고적격", "제소기간", "행정소송"], theory: "취소소송은 위법한 처분 취소를 구하며 원고적격·제소기간이 자주 출제된다." },
  { title: "대집행·강제징수", years: "2024·2025", subject: "행정법총론", keys: ["대집행", "강제징수", "행정강제"], theory: "대집행은 대체적 작위의무, 강제징수는 금전급부의무 불이행에 대한 강제집행이다." },
];

const TREND_TOP: TrendItem[] = [
  { rank: 1, title: "사회복지실천 모델·기술", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["실천", "해결중심", "사례관리", "환경 속의 인간"], desc: "실천모델 구분, 사정·종결, 사례관리, 실천기술을 우선 복습" },
  { rank: 2, title: "사회복지정책·복지국가·급여", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["복지국가", "정책", "재분배", "사회보장"], desc: "잔여·제도적 관점, 복지국가 유형, 재분배, 사회보험·공공부조" },
  { rank: 3, title: "사회복지법제·제도", years: "2024·2025·2026", subject: "사회복지학개론", keys: ["법", "사회보장"], desc: "기초연금·장애인·정신건강 등 법령형 선지 판별" },
  { rank: 4, title: "조사론·프로그램 평가", years: "2024·2025", subject: "사회복지학개론", keys: ["조사", "표집", "평가"], desc: "표집, 프로그램 평가, 조사 설계·기초통계 개념" },
  { rank: 5, title: "지역사회복지·로스만", years: "2024·2025", subject: "사회복지학개론", keys: ["지역사회", "로스만"], desc: "지역사회개발·사회계획·사회행동 모델과 사회복지사 역할" },
  { rank: 6, title: "행정행위·행정절차", years: "2024·2025·2026", subject: "행정법총론", keys: ["행정행위", "행정지도", "행정입법", "신고"], desc: "행정행위 효력·하자, 신고, 행정절차 및 행정입법" },
  { rank: 7, title: "행정쟁송·권리구제", years: "2024·2025·2026", subject: "행정법총론", keys: ["행정소송", "행정심판", "집행정지"], desc: "취소소송, 원고적격, 제소기간, 집행정지·행정심판" },
  { rank: 8, title: "행정법 일반원칙·재량", years: "2024·2025·2026", subject: "행정법총론", keys: ["신뢰보호", "비례원칙", "재량"], desc: "신뢰보호·비례·자기구속, 재량권 일탈·남용" },
];

function defaultProgress(): ProgressState {
  return { totalAnswered: 0, totalCorrect: 0, byQuestion: {}, history: [] };
}

function loadProgress(): ProgressState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultProgress();
    const parsed = JSON.parse(stored) as ProgressState;
    return parsed?.byQuestion ? { ...defaultProgress(), ...parsed, history: parsed.history ?? [] } : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function progressPercent(progress: ProgressState, questions: Question[]) {
  const attempts = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.attempts ?? 0), 0);
  const correct = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.correct ?? 0), 0);
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function AppMark() {
  return (
    <div className="app-mark" aria-label="복지시험 AI 코치">
      <span className="app-mark-orbit" />
      <span className="app-mark-core"><Sparkles size={17} /></span>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "mint" | "violet" | "amber" | "coral" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function StatTile({ label, value, caption, accent }: { label: string; value: string; caption: string; accent: string }) {
  return (
    <div className={`stat-tile ${accent}`}>
      <span className="stat-tile-label">{label}</span>
      <strong>{value}</strong>
      <span className="stat-tile-caption">{caption}</span>
    </div>
  );
}

export default function Home() {
  const [exam, setExam] = useState<Exam>("사회복지사1급");
  const [view, setView] = useState<View>("home");
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [quiz, setQuiz] = useState<{ questions: Question[]; mode: Mode } | null>(null);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const examQuestions = useMemo(() => BANK.filter((question) => question.exam === exam), [exam]);
  const wrongQuestions = useMemo(
    () => examQuestions.filter((question) => (progress.byQuestion[question.id]?.wrong ?? 0) > 0),
    [examQuestions, progress],
  );
  const dueQuestions = useMemo(
    () => examQuestions.filter((question) => {
      const item = progress.byQuestion[question.id];
      return item && new Date(item.dueAt).getTime() <= Date.now();
    }),
    [examQuestions, progress],
  );
  const subjectStats = useMemo(() => {
    const subjects = Array.from(new Set(examQuestions.map((question) => question.subject)));
    return subjects.map((subject) => {
      const questions = examQuestions.filter((question) => question.subject === subject);
      const answered = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.attempts ?? 0), 0);
      const correct = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.correct ?? 0), 0);
      const wrong = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.wrong ?? 0), 0);
      return { subject, answered, correct, wrong, rate: answered ? Math.round((correct / answered) * 100) : 0 };
    }).sort((a, b) => (a.rate - b.rate) || (b.wrong - a.wrong));
  }, [examQuestions, progress]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigate = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startQuiz = (questions: Question[], mode: Mode) => {
    if (!questions.length) {
      setToast("지금은 복습할 문제가 없어요. 먼저 문제를 풀어보세요.");
      return;
    }
    setQuiz({ questions: shuffle(questions), mode });
    navigate("quiz");
  };

  const recordAnswer = (question: Question, selected: number) => {
    const isCorrect = selected === question.answer;
    setProgress((current) => {
      const previous = current.byQuestion[question.id] ?? { attempts: 0, correct: 0, wrong: 0, lastAnswered: "", dueAt: "" };
      return {
        totalAnswered: current.totalAnswered + 1,
        totalCorrect: current.totalCorrect + (isCorrect ? 1 : 0),
        history: [...current.history, {
          questionId: question.id,
          exam: question.exam,
          subject: question.subject,
          keyword: question.keyword,
          correct: isCorrect,
          date: new Date().toISOString(),
          pastYear: question.exam === "지방9급" ? (question.trainingYear ?? [2024, 2025, 2026][question.id % 3]) : undefined,
        }],
        byQuestion: {
          ...current.byQuestion,
          [question.id]: {
            attempts: previous.attempts + 1,
            correct: previous.correct + (isCorrect ? 1 : 0),
            wrong: isCorrect ? 0 : previous.wrong + 1,
            lastAnswered: new Date().toISOString(),
            dueAt: daysFromNow(isCorrect ? 3 : 1),
          },
        },
      };
    });
  };

  const todayQuestions = examQuestions.filter((question) => question.id % 3 !== 2).slice(0, 10);
  const currentScore = progressPercent(progress, examQuestions);
  const todayAnswered = examQuestions.reduce((sum, question) => {
    const attempt = progress.byQuestion[question.id];
    return sum + (attempt?.lastAnswered?.startsWith(dateKey()) ? 1 : 0);
  }, 0);

  const renderView = () => {
    if (view === "quiz" && quiz) {
      return <QuizView quiz={quiz} onBack={() => navigate("home")} onAnswer={recordAnswer} onFinish={() => navigate("home")} />;
    }
    if (view === "wrong") {
      return <WrongView questions={wrongQuestions} onStart={() => startQuiz(wrongQuestions, "오답 재시험")} onBack={() => navigate("home")} />;
    }
    if (view === "stats") {
      return <StatsView exam={exam} questions={examQuestions} stats={subjectStats} progress={progress} onBack={() => navigate("home")} />;
    }
    if (view === "flash") {
      const flashQuestions = wrongQuestions.length ? wrongQuestions : examQuestions;
      const card = flashQuestions[flashIndex % Math.max(flashQuestions.length, 1)];
      return (
        <FlashView
          question={card}
          index={flashIndex}
          total={flashQuestions.length}
          flipped={flashFlipped}
          onFlip={() => setFlashFlipped((current) => !current)}
          onNext={() => { setFlashIndex((current) => current + 1); setFlashFlipped(false); }}
          onBack={() => navigate("home")}
        />
      );
    }
    if (view === "weekly") {
      return <WeeklyView exam={exam} questions={examQuestions} progress={progress} onBack={() => navigate("home")} />;
    }
    return (
      <Dashboard
        exam={exam}
        examQuestions={examQuestions}
        wrongQuestions={wrongQuestions}
        dueQuestions={dueQuestions}
        subjectStats={subjectStats}
        progress={progress}
        currentScore={currentScore}
        todayAnswered={todayAnswered}
        onStartToday={() => startQuiz(todayQuestions, "오늘의 10문제")}
        onStartRandom={() => startQuiz(examQuestions, "랜덤 20")}
        onStartMock={() => startQuiz(exam === "지방9급" ? examQuestions : examQuestions, "100문항 실전모의")}
        onStartWrong={() => startQuiz(wrongQuestions, "오답 재시험")}
        onStartWeak={() => startQuiz(examQuestions.filter((question) => subjectStats[0]?.subject === question.subject).slice(0, 10), "취약과목")}
        onReviewDue={() => startQuiz(dueQuestions.length ? dueQuestions : wrongQuestions, "오늘 복습")}
        onShowPlan={() => setToast("오늘은 20분 개념 → 10문제 → 오답 3개 복습 순서가 좋아요.")}
        onOfficial={() => window.open("https://gongmuwon.gosi.kr/oprut/EvmArPrblmCransGdLst.do", "_blank", "noopener,noreferrer")}
        onStartCustom={(questions, mode) => startQuiz(questions, mode)}
        onNavigate={navigate}
      />
    );
  };

  const navItems: { id: View; label: string; icon: typeof HomeIcon }[] = [
    { id: "home", label: "홈", icon: HomeIcon },
    { id: "wrong", label: "오답", icon: FileText },
    { id: "stats", label: "분석", icon: BarChart3 },
    { id: "flash", label: "암기", icon: Brain },
    { id: "weekly", label: "주간", icon: CalendarDays },
  ];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar page-width">
        <button className="brand-button" onClick={() => navigate("home")} aria-label="홈으로 이동">
          <AppMark />
          <span><strong>복지시험</strong><small>AI COACH <em>MAX</em></small></span>
        </button>
        <div className="topbar-actions">
          <span className="status-dot"><span /> 학습 저장됨</span>
          <button className="avatar" aria-label="프로필">J</button>
        </div>
      </header>

      <div className="exam-switch page-width" role="tablist" aria-label="시험 선택">
        {(Object.keys(EXAM_LABEL) as Exam[]).map((key) => {
          const Icon = EXAM_LABEL[key].icon;
          return (
            <button key={key} className={exam === key ? "active" : ""} onClick={() => { setExam(key); navigate("home"); }} role="tab" aria-selected={exam === key}>
              <Icon size={16} /> <span>{EXAM_LABEL[key].short}</span>
            </button>
          );
        })}
      </div>

      <main className="page-width main-content">{renderView()}</main>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}>
            <Icon size={19} strokeWidth={view === id ? 2.5 : 1.8} />
            <span>{label}</span>
            {id === "wrong" && wrongQuestions.length > 0 && <b>{wrongQuestions.length}</b>}
          </button>
        ))}
      </nav>
      {toast && <div className="toast"><Sparkles size={16} /> {toast}<button onClick={() => setToast(null)} aria-label="닫기"><X size={14} /></button></div>}
    </div>
  );
}

function Dashboard({
  exam, examQuestions, wrongQuestions, dueQuestions, subjectStats, progress, currentScore, todayAnswered,
  onStartToday, onStartRandom, onStartMock, onStartWrong, onStartWeak, onReviewDue, onShowPlan, onOfficial, onStartCustom, onNavigate,
}: {
  exam: Exam; examQuestions: Question[]; wrongQuestions: Question[]; dueQuestions: Question[]; subjectStats: { subject: string; answered: number; correct: number; wrong: number; rate: number }[]; progress: ProgressState; currentScore: number; todayAnswered: number;
  onStartToday: () => void; onStartRandom: () => void; onStartMock: () => void; onStartWrong: () => void; onStartWeak: () => void; onReviewDue: () => void; onShowPlan: () => void; onOfficial: () => void; onStartCustom: (questions: Question[], mode: Mode) => void; onNavigate: (view: View) => void;
}) {
  const examInfo = EXAM_LABEL[exam];
  const Icon = examInfo.icon;
  const weak = subjectStats[0];
  const totalConcepts = Math.max(wrongQuestions.length, 0);

  return (
    <div className="dashboard-stack">
      <section className="welcome-row reveal">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> MONDAY, SEPTEMBER 8</p>
          <h1>오늘도 <span>한 문제씩</span>,<br />합격에 가까워져요.</h1>
          <p className="lede">{examInfo.description}</p>
        </div>
        <div className="goal-ring" style={{ "--progress": `${Math.max(currentScore, todayAnswered ? 24 : 12)}%` } as React.CSSProperties}>
          <div><strong>{currentScore || 0}<small>%</small></strong><span>현재 정답률</span></div>
        </div>
      </section>

      <section className="hero-card reveal delay-1">
        <div className="hero-card-copy">
          <div className="hero-topline"><Pill tone="mint"><Zap size={12} /> 오늘의 루틴</Pill><span>약 12분</span></div>
          <h2>가볍게 시작하는<br /><strong>데일리 10문제</strong></h2>
          <p>자주 틀리는 개념을 우선으로 골라<br />오늘의 학습 리듬을 만들어드려요.</p>
          <button className="primary-button light" onClick={onStartToday}><Play size={15} fill="currentColor" /> 학습 시작 <ArrowUpRight size={15} /></button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-grid" />
          <div className="floating-card floating-card-main"><Target size={18} /><span>정답률</span><strong>{currentScore}%</strong><i /></div>
          <div className="floating-card floating-card-small"><CircleCheck size={16} /><strong>{todayAnswered}/10</strong><span>오늘 완료</span></div>
          <div className="hero-orb"><Sparkles size={28} /></div>
        </div>
      </section>

      <section className="stat-grid reveal delay-2">
        <StatTile label="누적 풀이" value={formatNumber(progress.totalAnswered)} caption="문제" accent="blue" />
        <StatTile label="오답 개념" value={formatNumber(totalConcepts)} caption="복습 대기" accent="coral" />
        <StatTile label="연속 학습" value="3" caption="일째" accent="violet" />
      </section>

      <section className="section-heading reveal delay-2"><div><span className="section-kicker">QUICK STUDY</span><h2>빠른 학습</h2></div><button className="text-button" onClick={() => onNavigate("stats")}>전체 분석 보기 <ChevronRight size={15} /></button></section>
      <section className="quick-grid reveal delay-3">
        <button className="quick-card quick-blue" onClick={onStartRandom}><span className="quick-icon"><Sparkles size={18} /></span><strong>랜덤 20</strong><small>범위 전체에서 출제</small><ArrowUpRight size={16} /></button>
        <button className="quick-card quick-coral" onClick={onStartWrong}><span className="quick-icon"><RotateCcw size={18} /></span><strong>오답 재시험</strong><small>{wrongQuestions.length ? `${wrongQuestions.length}개 개념 대기 중` : "먼저 문제를 풀어보세요"}</small><ArrowUpRight size={16} /></button>
        <button className="quick-card quick-violet" onClick={onStartWeak}><span className="quick-icon"><Flame size={18} /></span><strong>취약과목</strong><small>{weak?.subject ?? "데이터를 쌓아보세요"}</small><ArrowUpRight size={16} /></button>
        <button className="quick-card quick-mint" onClick={onReviewDue}><span className="quick-icon"><Clock3 size={18} /></span><strong>오늘 복습</strong><small>{dueQuestions.length || wrongQuestions.length}개 복습 예정</small><ArrowUpRight size={16} /></button>
      </section>

      <section className="section-heading reveal delay-3"><div><span className="section-kicker">YOUR FOCUS</span><h2>이번 주 집중 과목</h2></div><Pill>{subjectStats.length}개 과목</Pill></section>
      <section className="focus-layout reveal delay-4">
        <div className="focus-card">
          {subjectStats.slice(0, 4).map((item, index) => (
            <div className="focus-row" key={item.subject}>
              <div className="focus-rank">0{index + 1}</div>
              <div className="focus-label"><strong>{item.subject}</strong><span>{item.answered ? `${item.rate}% 정답률` : "아직 시작 전"}</span></div>
              <div className="focus-bar"><i style={{ width: `${item.rate || 4}%` }} /></div>
              <span className={item.rate < 60 ? "focus-score low" : "focus-score"}>{item.rate}%</span>
            </div>
          ))}
        </div>
        <div className="official-card">
          <div className="official-icon"><ShieldCheck size={20} /></div>
          <Pill tone="mint">OFFICIAL LINK</Pill>
          <h3>실제 기출은<br /><span>공식 원문</span>으로</h3>
          <p>시험지를 복제하지 않고 공식 문제를 푼 뒤, 앱에서 같은 개념을 재훈련해요.</p>
          <button className="outline-button" onClick={onOfficial}>기출 학습센터 <ExternalLink size={14} /></button>
        </div>
      </section>

      <section className="plan-card reveal delay-4">
        <div className="plan-icon"><CalendarDays size={20} /></div>
        <div className="plan-copy"><span className="section-kicker">SMART REVIEW</span><h3>1·3·7일 반복 복습</h3><p>기억이 흐려지기 전에 다시 만나면 오래 남아요.</p></div>
        <button className="text-button" onClick={onShowPlan}>복습 계획 <ChevronRight size={15} /></button>
      </section>

      {exam === "지방9급" && <section className="mock-card reveal delay-4"><div><Pill tone="violet">2027 PRACTICE</Pill><h3>실전모의 100문항</h3><p>국어·영어·사회복지학개론·행정법총론을 한 번에 점검해요.</p></div><button className="primary-button dark" onClick={onStartMock}>모의고사 시작 <ArrowUpRight size={15} /></button></section>}
      {exam === "지방9급" && <PastExamInsights history={progress.history} questions={examQuestions} onStart={onStartCustom} />}
      {exam === "지방9급" && <section className="history-note"><Lightbulb size={16} /><span><strong>출처 표시 기준</strong>　🔥 공식 원문 · 🔄 기출개념 변형 · ✨ 예상·연습</span></section>}
    </div>
  );
}

function PastExamInsights({ history, questions, onStart }: { history: AnswerHistory[]; questions: Question[]; onStart: (questions: Question[], mode: Mode) => void }) {
  const [year, setYear] = useState(2026);
  const [activeConceptTitle, setActiveConceptTitle] = useState<string | null>(null);
  const aiConcept = trpc.ai.explainConcept.useMutation();
  const yearHistory = history.filter((item) => item.exam === "지방9급" && item.pastYear === year);
  const yearRate = yearHistory.length ? Math.round((yearHistory.filter((item) => item.correct).length / yearHistory.length) * 100) : 0;
  const subjectRows = Array.from(new Set(yearHistory.map((item) => item.subject))).map((subject) => {
    const items = yearHistory.filter((item) => item.subject === subject);
    return { subject, total: items.length, rate: Math.round((items.filter((item) => item.correct).length / items.length) * 100) };
  }).sort((a, b) => a.rate - b.rate);
  const weakConcepts = Object.entries(yearHistory.filter((item) => !item.correct).reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.keyword]: (acc[item.keyword] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const startYearTraining = () => onStart(questions.filter((question) => question.exam === "지방9급").slice(0, 20).map((question) => ({ ...question, trainingYear: year })), `${year} 기출유형 연습 20`);
  const startYearWeak = () => {
    const wrongIds = new Set(yearHistory.filter((item) => !item.correct).map((item) => item.questionId));
    onStart(questions.filter((question) => wrongIds.has(question.id)).map((question) => ({ ...question, trainingYear: year })), `${year} 약점 재시험`);
  };
  const startTopic = (topic: ConceptItem | TrendItem) => {
    const pool = questions.filter((question) => question.subject === topic.subject && topic.keys.some((key) => `${question.keyword} ${question.q} ${question.explain}`.includes(key)));
    onStart((pool.length ? pool : questions.filter((question) => question.subject === topic.subject)).map((question) => ({ ...question, trainingYear: year })).slice(0, "rank" in topic ? 20 : 5), "rank" in topic ? `3개년 빈출 · ${topic.title}` : `빈출개념 5문제 · ${topic.title}`);
  };
  const requestConceptExplanation = (concept: ConceptItem) => {
    setActiveConceptTitle(concept.title);
    aiConcept.reset();
    aiConcept.mutate({ concept: { title: concept.title, subject: concept.subject, theory: concept.theory, keywords: concept.keys } });
  };

  return <section className="past-insights reveal delay-4">
    <div className="section-heading"><div><span className="section-kicker">PAST EXAM WEAKNESS</span><h2>연도별 기출 약점</h2></div><Pill tone="violet">2024·2025·2026</Pill></div>
    <div className="year-tabs">{[2024, 2025, 2026].map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => setYear(item)}>{item}</button>)}</div>
    <div className="year-summary"><strong>{yearHistory.length ? `${year} 기출유형 정답률 ${yearRate}%` : `${year} 기출유형 학습기록 없음`}</strong><span>{yearHistory.length ? `총 ${yearHistory.length}문제 · 정답 ${yearHistory.filter((item) => item.correct).length} · 오답 ${yearHistory.filter((item) => !item.correct).length}` : "관련 연습문제를 풀면 이 연도 탭에 정답률과 취약개념이 누적돼요."}</span></div>
    {subjectRows.length > 0 && <div className="year-subject-grid">{subjectRows.map((item) => <div className="year-subject-card" key={item.subject}><div><strong>{item.subject}</strong><span>{item.total}문제 풀이</span></div><b className={item.rate < 60 ? "low" : ""}>{item.rate}%</b><i><em style={{ width: `${Math.max(item.rate, 4)}%` }} /></i></div>)}</div>}
    {weakConcepts.length > 0 && <div className="year-weak-list"><h3>취약개념 TOP 5</h3>{weakConcepts.map(([keyword, count], index) => <span key={keyword}><b>{index + 1}</b>{keyword}<em>{count}회</em></span>)}</div>}
    <button className="primary-button dark full" onClick={yearHistory.length && weakConcepts.length ? startYearWeak : startYearTraining}>{yearHistory.length && weakConcepts.length ? `${year} 약점만 다시 풀기` : `${year} 기출유형 20문제 시작`} <ArrowUpRight size={15} /></button>
    <div className="insight-subheading"><div><span className="section-kicker">FREQUENCY MAP</span><h3>3개년 빈출 TOP</h3></div><span>탭하면 관련 문제로 이동</span></div>
    <div className="trend-grid">{TREND_TOP.map((trend) => <button className="trend-card" key={trend.rank} onClick={() => startTopic(trend)}><div><b>TOP {trend.rank}</b><strong>{trend.title}</strong></div><Pill tone="mint">{trend.years}</Pill><p>{trend.desc}</p><small>관련 연습문제 풀기 <ChevronRight size={12} /></small></button>)}</div>
    <div className="insight-subheading"><div><span className="section-kicker">CONCEPT LIBRARY</span><h3>빈출개념 암기장</h3></div><span>핵심이론 → 5문제</span></div>
    <div className="concept-grid">{CONCEPT_TOP.map((concept) => { const active = activeConceptTitle === concept.title; return <div className={`concept-card ${active ? "active" : ""}`} key={concept.title}><div className="concept-card-head"><strong>{concept.title}</strong><Pill tone="mint">{concept.years}</Pill></div><p>{concept.theory}</p><div className="concept-card-actions"><button onClick={() => startTopic(concept)}>5문제 풀기 <ArrowUpRight size={13} /></button><button className="concept-ai-button" onClick={() => requestConceptExplanation(concept)} disabled={aiConcept.isPending && active}><Sparkles size={13} />{aiConcept.isPending && active ? "AI 설명 중..." : active && aiConcept.data ? "다시 설명" : "AI 쉽게 설명"}</button></div>{active && <AIConceptPanel result={aiConcept.data as AIConceptExplanation | undefined} loading={aiConcept.isPending} error={aiConcept.error?.message} />}</div>; })}</div>
  </section>;
}

function AIConceptPanel({ result, loading, error }: { result?: AIConceptExplanation; loading: boolean; error?: string }) {
  if (loading) return <div className="concept-ai-panel concept-ai-loading"><div className="concept-ai-orb"><Sparkles size={15} /></div><div><strong>AI가 쉬운 말로 바꾸는 중이에요</strong><p>시험 포인트와 헷갈리는 개념까지 정리하고 있어요.</p></div><span className="ai-dots"><i /><i /><i /></span></div>;
  if (error) return <div className="concept-ai-panel concept-ai-error"><CircleX size={16} /><div><strong>설명을 불러오지 못했어요</strong><p>{error}</p></div></div>;
  if (!result) return null;
  return <div className="concept-ai-panel"><div className="concept-ai-heading"><span><Sparkles size={14} /> AI 쉬운 설명</span><Pill tone="violet">핵심 개념</Pill></div><div className="concept-one-line">{result.oneLine}</div><div className="concept-ai-section"><h4>쉽게 풀면</h4><p>{result.easyExplanation}</p></div><div className="concept-ai-section"><h4>예시로 이해하기</h4><p>{result.example}</p></div><div className="concept-ai-section"><h4>헷갈리는 개념과 구별</h4><p>{result.distinction}</p></div><div className="concept-memory-tip"><span>암기 한 문장</span><strong>{result.memoryTip}</strong></div><div className="concept-check-points"><h4>문제에서 확인할 것</h4>{result.checkPoints.map((point, index) => <p key={point}><b>{index + 1}</b>{point}</p>)}</div></div>;
}

function QuizView({ quiz, onBack, onAnswer, onFinish }: { quiz: { questions: Question[]; mode: Mode }; onBack: () => void; onAnswer: (question: Question, selected: number) => void; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const question = quiz.questions[index];
  const percent = Math.round(((index + (selected !== null ? 1 : 0)) / quiz.questions.length) * 100);

  const choose = (choiceIndex: number) => {
    if (selected !== null) return;
    setSelected(choiceIndex);
    if (choiceIndex === question.answer) setSessionCorrect((current) => current + 1);
    onAnswer(question, choiceIndex);
  };

  const next = () => {
    if (index >= quiz.questions.length - 1) setFinished(true);
    else { setIndex((current) => current + 1); setSelected(null); }
  };

  if (finished) {
    const score = Math.round((sessionCorrect / quiz.questions.length) * 100);
    return <section className="quiz-page"><div className="quiz-top"><button className="icon-text-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 나가기</button><Pill tone="violet">학습 완료</Pill></div><div className="result-card"><div className="result-confetti"><Trophy size={30} /></div><span className="section-kicker">SESSION COMPLETE</span><h1>오늘의 문제를<br /><span>끝까지 풀었어요.</span></h1><p>한 번의 풀이가 합격 루틴을 더 단단하게 만들어요.</p><div className="result-score"><strong>{score}<small>%</small></strong><span>이번 세션 정답률</span></div><div className="result-meta"><div><strong>{quiz.questions.length}</strong><span>풀이 문제</span></div><div><strong>{sessionCorrect}</strong><span>맞힌 문제</span></div><div><strong>{quiz.questions.length - sessionCorrect}</strong><span>복습할 문제</span></div></div><button className="primary-button dark full" onClick={onFinish}>홈으로 돌아가기 <ArrowUpRight size={15} /></button></div></section>;
  }

  return (
    <section className="quiz-page">
      <div className="quiz-top"><button className="icon-text-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 나가기</button><div className="quiz-top-right"><Pill tone="violet">{quiz.mode}</Pill><span className="quiz-count">{index + 1} / {quiz.questions.length}</span></div></div>
      <div className="quiz-progress"><i style={{ width: `${percent}%` }} /></div>
      <div className="quiz-meta"><span>{question.subject}</span><Pill tone={question.era ? "amber" : "neutral"}>{question.era ? `${question.era} 시대` : "예상·연습"}</Pill></div>
      <div className="question-card">
        <div className="question-number">QUESTION <strong>{String(index + 1).padStart(2, "0")}</strong></div>
        <h1>{question.q}</h1>
        <div className="choice-list">
          {question.choices.map((choice, choiceIndex) => {
            const isCorrect = choiceIndex === question.answer;
            const isSelected = choiceIndex === selected;
            return <button key={choice} className={`choice-button ${selected !== null && isCorrect ? "correct" : ""} ${selected !== null && isSelected && !isCorrect ? "incorrect" : ""}`} onClick={() => choose(choiceIndex)} disabled={selected !== null}><span className="choice-number">{String.fromCharCode(65 + choiceIndex)}</span><span>{choice}</span>{selected !== null && isCorrect && <CircleCheck size={18} />}{selected !== null && isSelected && !isCorrect && <CircleX size={18} />}</button>;
          })}
        </div>
        {selected !== null && <div className={`explanation ${selected === question.answer ? "explanation-correct" : "explanation-wrong"}`}><div className="explanation-title">{selected === question.answer ? <><CircleCheck size={17} /> 정답이에요</> : <><CircleX size={17} /> 다시 기억해볼까요?</>}</div><p>{question.explain}</p><span><Lightbulb size={14} /> {question.keyword}</span></div>}
        {selected !== null && <button className="primary-button dark full next-button" onClick={next}>{index === quiz.questions.length - 1 ? "결과 보기" : "다음 문제"} <ChevronRight size={15} /></button>}
      </div>
      <div className="quiz-tip"><Lightbulb size={15} /><span>정답을 고른 뒤 해설의 <strong>핵심 키워드</strong>를 소리 내어 읽어보세요.</span></div>
    </section>
  );
}

function WrongView({ questions, onStart, onBack }: { questions: Question[]; onStart: () => void; onBack: () => void }) {
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const aiExplanation = trpc.ai.explainQuestion.useMutation();

  const requestExplanation = (question: Question) => {
    setActiveQuestionId(question.id);
    aiExplanation.reset();
    aiExplanation.mutate({
      question: {
        exam: question.exam,
        subject: question.subject,
        q: question.q,
        choices: question.choices,
        answer: question.answer,
        explain: question.explain,
        keyword: question.keyword,
        era: question.era,
      },
    });
  };

  return (
    <section className="subpage">
      <div className="subpage-heading"><div><button className="back-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 홈</button><span className="section-kicker">REVIEW NOTE</span><h1>오답노트</h1><p>틀린 문제는 약점이 아니라, 다음 정답의 힌트예요.</p></div><div className="subpage-count"><strong>{questions.length}</strong><span>복습 대기</span></div></div>
      <div className="subpage-action"><div><RotateCcw size={19} /><strong>오답만 다시 풀기</strong><span>틀린 개념을 섞어서 재훈련해요.</span></div><button className="primary-button dark" onClick={onStart} disabled={!questions.length}>시작 <ArrowUpRight size={15} /></button></div>
      <div className="list-card">
        {questions.length ? questions.map((question, index) => {
          const isActive = activeQuestionId === question.id;
          return (
            <div className={`wrong-item ${isActive ? "active" : ""}`} key={question.id}>
              <div className="wrong-row"><div className="wrong-index">{String(index + 1).padStart(2, "0")}</div><div><Pill tone="coral">{question.subject}</Pill><h3>{question.q}</h3><p>{question.keyword} · 다시 풀어보기</p><div className="wrong-row-actions"><button className="ai-explain-button" onClick={() => requestExplanation(question)} disabled={aiExplanation.isPending && isActive}><Sparkles size={14} />{aiExplanation.isPending && isActive ? "AI가 분석 중..." : isActive && aiExplanation.data ? "해설 다시 생성" : "AI 상세 해설"}</button><span>관련 개념 · 암기 팁 포함</span></div></div><CircleX size={18} className="wrong-mark" /></div>
              {isActive && <AIExplanationPanel question={question} result={aiExplanation.data as AIExplanation | undefined} loading={aiExplanation.isPending} error={aiExplanation.error?.message} />}
            </div>
          );
        }) : <div className="empty-state"><CircleCheck size={26} /><h3>아직 오답이 없어요</h3><p>오늘의 10문제를 풀면 약점이 자동으로 모여요.</p></div>}
      </div>
    </section>
  );
}

function AIExplanationPanel({ question, result, loading, error }: { question: Question; result?: AIExplanation; loading: boolean; error?: string }) {
  if (loading) return <div className="ai-explanation-panel ai-loading"><div className="ai-loading-orb"><Sparkles size={18} /></div><div><strong>AI 튜터가 문제를 해부하고 있어요</strong><p>정답 근거와 헷갈리기 쉬운 관련 개념을 정리하는 중입니다.</p></div><span className="ai-dots"><i /><i /><i /></span></div>;
  if (error) return <div className="ai-explanation-panel ai-error"><CircleX size={18} /><div><strong>해설을 불러오지 못했어요</strong><p>{error}</p></div></div>;
  if (!result) return null;

  return (
    <div className="ai-explanation-panel">
      <div className="ai-panel-heading"><div className="ai-panel-title"><span className="ai-spark"><Sparkles size={15} /></span><div><span className="section-kicker">AI TUTOR NOTE</span><strong>{question.keyword} 완전 정리</strong></div></div><Pill tone="violet">개념 연결</Pill></div>
      <div className="ai-summary"><span>핵심 한 줄</span><p>{result.summary}</p></div>
      <div className="ai-detail-block"><h4><CircleCheck size={15} /> 왜 이 답이 정답인가요?</h4><p>{result.whyCorrect}</p></div>
      <div className="ai-choice-block"><h4>보기별 판단 포인트</h4>{question.choices.map((choice, index) => <div className={`ai-choice-row ${index === question.answer ? "correct" : ""}`} key={`${choice}-${index}`}><b>{String.fromCharCode(65 + index)}</b><span><strong>{choice}</strong>{result.choiceExplanations[index] ?? "이 보기의 핵심 판단 포인트를 다시 확인해보세요."}</span>{index === question.answer ? <CircleCheck size={15} /> : <CircleX size={15} />}</div>)}</div>
      <div className="ai-related"><h4><Lightbulb size={15} /> 같이 연결할 개념</h4><div className="ai-related-grid">{result.relatedConcepts.map((concept) => <div key={concept.title}><strong>{concept.title}</strong><p>{concept.explanation}</p></div>)}</div></div>
      <div className="ai-memory"><span>시험 직전 암기 팁</span><strong>{result.memoryTip}</strong></div>
      <div className="ai-next"><h4>다음 복습 때 이렇게 해보세요</h4>{result.nextSteps.map((step, index) => <p key={step}><b>{index + 1}</b>{step}</p>)}</div>
    </div>
  );
}

function StatsView({ exam, questions, stats, progress, onBack }: { exam: Exam; questions: Question[]; stats: { subject: string; answered: number; correct: number; wrong: number; rate: number }[]; progress: ProgressState; onBack: () => void }) {
  const answered = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.attempts ?? 0), 0);
  const correct = questions.reduce((sum, question) => sum + (progress.byQuestion[question.id]?.correct ?? 0), 0);
  const rate = answered ? Math.round((correct / answered) * 100) : 0;
  return <section className="subpage"><div className="subpage-heading"><div><button className="back-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 홈</button><span className="section-kicker">LEARNING ANALYTICS</span><h1>학습 분석</h1><p>{EXAM_LABEL[exam].short}에서 쌓은 학습 데이터를 한눈에 봐요.</p></div><div className="analytics-score"><strong>{rate}%</strong><span>전체 정답률</span></div></div><div className="analytics-hero"><div><span className="section-kicker">YOUR MOMENTUM</span><h2>{rate >= 70 ? "좋은 흐름이에요." : "기초를 쌓는 중이에요."}</h2><p>{answered ? `총 ${formatNumber(answered)}문제를 풀었고, ${formatNumber(correct)}문제를 맞혔어요.` : "문제를 풀면 과목별 정답률이 이곳에 쌓여요."}</p></div><div className="analytics-orb"><BarChart3 size={30} /></div></div><div className="list-card stats-list"><div className="list-card-heading"><h2>과목별 정답률</h2><span>취약 과목부터 표시</span></div>{stats.map((item) => <div className="analytics-row" key={item.subject}><div className="analytics-label"><strong>{item.subject}</strong><span>{item.answered ? `${item.correct}정답 · ${item.wrong}오답 누적` : "아직 풀이 전"}</span></div><div className="analytics-bar"><i style={{ width: `${item.rate || 3}%` }} /></div><strong className={item.rate < 60 ? "low" : ""}>{item.rate}%</strong></div>)}</div><div className="insight-card"><Lightbulb size={18} /><div><strong>AI 복습 요약</strong><p>{stats[0]?.answered ? `현재 가장 먼저 복습할 과목은 ${stats[0].subject}이에요. 오답 키워드를 1·3·7일 간격으로 다시 만나보세요.` : "첫 문제를 풀면 현재 학습 상태에 맞는 복습 요약을 만들어드려요."}</p></div></div></section>;
}

function FlashView({ question, index, total, flipped, onFlip, onNext, onBack }: { question?: Question; index: number; total: number; flipped: boolean; onFlip: () => void; onNext: () => void; onBack: () => void }) {
  if (!question) return <section className="subpage"><button className="back-button" onClick={onBack}>홈</button><div className="empty-state">암기카드를 준비하고 있어요.</div></section>;
  return <section className="subpage flash-page"><div className="subpage-heading"><div><button className="back-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 홈</button><span className="section-kicker">MEMORY CARDS</span><h1>암기카드</h1><p>{total}개의 핵심 개념을 짧게 반복해요.</p></div><span className="flash-counter">{index + 1} / {total}</span></div><div className={`flash-card ${flipped ? "flipped" : ""}`} onClick={onFlip} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onFlip()}><div className="flash-card-glow" /><div className="flash-label">{flipped ? "핵심 해설" : "QUESTION CARD"}</div>{flipped ? <><h2>{question.explain}</h2><div className="flash-keyword"><Lightbulb size={15} /> {question.keyword}</div></> : <><span className="flash-subject">{question.subject}</span><h2>{question.q}</h2><p>카드를 눌러 정답 확인</p></>}</div><div className="flash-actions"><button className="outline-button" onClick={onFlip}>{flipped ? "문제 다시 보기" : "정답 보기"}</button><button className="primary-button dark" onClick={onNext}>다음 카드 <ChevronRight size={15} /></button></div></section>;
}

function WeeklyView({ exam, questions, progress, onBack }: { exam: Exam; questions: Question[]; progress: ProgressState; onBack: () => void }) {
  const done = questions.filter((question) => progress.byQuestion[question.id]?.lastAnswered?.startsWith(dateKey())).length;
  const review = questions.filter((question) => (progress.byQuestion[question.id]?.wrong ?? 0) > 0).length;
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return <section className="subpage"><div className="subpage-heading"><div><button className="back-button" onClick={onBack}><ChevronRight size={16} className="rotate-180" /> 홈</button><span className="section-kicker">WEEKLY RECAP</span><h1>주간 요약</h1><p>{EXAM_LABEL[exam].short} 학습 리듬을 돌아봐요.</p></div><CalendarDays size={33} className="heading-art" /></div><div className="week-card"><div className="week-days">{days.map((day, index) => <div key={day} className={index === 0 ? "today" : index < 3 ? "done" : ""}><span>{day}</span><i>{index < 3 ? <Check size={13} /> : ""}</i></div>)}</div><div className="week-stats"><div><strong>{done}</strong><span>오늘 완료</span></div><div><strong>{formatNumber(progress.totalAnswered)}</strong><span>누적 풀이</span></div><div><strong>{review}</strong><span>복습 대기</span></div></div></div><div className="weekly-tips"><div className="weekly-tip"><Target size={19} /><div><strong>이번 주 목표</strong><p>하루 10문제, 3일 연속 학습으로 리듬을 만들어요.</p></div></div><div className="weekly-tip"><Trophy size={19} /><div><strong>잘하고 있는 점</strong><p>{done ? "오늘 목표를 시작했어요. 작은 완료가 큰 차이를 만들어요." : "지금 바로 첫 문제를 풀고 이번 주 기록을 시작해보세요."}</p></div></div></div></section>;
}
