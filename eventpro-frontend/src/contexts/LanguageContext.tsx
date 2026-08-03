import React, { createContext, useContext, useState, useEffect } from "react";

export type SupportedLanguage = "en" | "es" | "fr" | "pt" | "ht" | "zh" | "ar";

interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
];

// Translation keys and their values for each language
type TranslationKey =
  | "nav.home"
  | "nav.events"
  | "nav.login"
  | "nav.signup"
  | "nav.profile"
  | "nav.settings"
  | "nav.logout"
  | "home.hero.title"
  | "home.hero.subtitle"
  | "home.browse_events"
  | "home.trending"
  | "home.upcoming"
  | "events.search"
  | "events.filter"
  | "events.no_results"
  | "checkout.title"
  | "checkout.cart_empty"
  | "checkout.proceed"
  | "checkout.guest"
  | "checkout.total"
  | "common.loading"
  | "common.error"
  | "common.view_all"
  | "common.add_to_cart"
  | "common.buy_tickets";

type Translations = Record<TranslationKey, string>;

const translations: Record<SupportedLanguage, Translations> = {
  en: {
    "nav.home": "Home",
    "nav.events": "Events",
    "nav.login": "Log In",
    "nav.signup": "Sign Up",
    "nav.profile": "Profile",
    "nav.settings": "Settings",
    "nav.logout": "Log Out",
    "home.hero.title": "Experience Events Like Never Before",
    "home.hero.subtitle": "Your gateway to unforgettable experiences. Browse concerts, festivals, sports, and more.",
    "home.browse_events": "Browse Events",
    "home.trending": "Trending Now",
    "home.upcoming": "Upcoming Events",
    "events.search": "Search events...",
    "events.filter": "Filter",
    "events.no_results": "No events found",
    "checkout.title": "Checkout",
    "checkout.cart_empty": "Your cart is empty",
    "checkout.proceed": "Proceed to Payment",
    "checkout.guest": "Continue as Guest",
    "checkout.total": "Total",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.view_all": "View All",
    "common.add_to_cart": "Add to Cart",
    "common.buy_tickets": "Buy Tickets",
  },
  es: {
    "nav.home": "Inicio",
    "nav.events": "Eventos",
    "nav.login": "Iniciar Sesión",
    "nav.signup": "Registrarse",
    "nav.profile": "Perfil",
    "nav.settings": "Configuración",
    "nav.logout": "Cerrar Sesión",
    "home.hero.title": "Vive los Eventos Como Nunca Antes",
    "home.hero.subtitle": "Tu puerta a experiencias inolvidables. Explora conciertos, festivales, deportes y más.",
    "home.browse_events": "Explorar Eventos",
    "home.trending": "Tendencias",
    "home.upcoming": "Próximos Eventos",
    "events.search": "Buscar eventos...",
    "events.filter": "Filtrar",
    "events.no_results": "No se encontraron eventos",
    "checkout.title": "Pagar",
    "checkout.cart_empty": "Tu carrito está vacío",
    "checkout.proceed": "Proceder al Pago",
    "checkout.guest": "Continuar como Invitado",
    "checkout.total": "Total",
    "common.loading": "Cargando...",
    "common.error": "Algo salió mal",
    "common.view_all": "Ver Todo",
    "common.add_to_cart": "Añadir al Carrito",
    "common.buy_tickets": "Comprar Entradas",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.events": "Événements",
    "nav.login": "Connexion",
    "nav.signup": "S'inscrire",
    "nav.profile": "Profil",
    "nav.settings": "Paramètres",
    "nav.logout": "Déconnexion",
    "home.hero.title": "Vivez les Événements Comme Jamais",
    "home.hero.subtitle": "Votre porte vers des expériences inoubliables. Parcourez concerts, festivals, sports et plus.",
    "home.browse_events": "Parcourir les Événements",
    "home.trending": "Tendances",
    "home.upcoming": "Événements à Venir",
    "events.search": "Rechercher des événements...",
    "events.filter": "Filtrer",
    "events.no_results": "Aucun événement trouvé",
    "checkout.title": "Paiement",
    "checkout.cart_empty": "Votre panier est vide",
    "checkout.proceed": "Procéder au Paiement",
    "checkout.guest": "Continuer en tant qu'Invité",
    "checkout.total": "Total",
    "common.loading": "Chargement...",
    "common.error": "Une erreur s'est produite",
    "common.view_all": "Voir Tout",
    "common.add_to_cart": "Ajouter au Panier",
    "common.buy_tickets": "Acheter des Billets",
  },
  pt: {
    "nav.home": "Início",
    "nav.events": "Eventos",
    "nav.login": "Entrar",
    "nav.signup": "Cadastrar",
    "nav.profile": "Perfil",
    "nav.settings": "Configurações",
    "nav.logout": "Sair",
    "home.hero.title": "Viva os Eventos Como Nunca",
    "home.hero.subtitle": "Sua porta para experiências inesquecíveis. Explore shows, festivais, esportes e mais.",
    "home.browse_events": "Explorar Eventos",
    "home.trending": "Em Alta",
    "home.upcoming": "Próximos Eventos",
    "events.search": "Buscar eventos...",
    "events.filter": "Filtrar",
    "events.no_results": "Nenhum evento encontrado",
    "checkout.title": "Finalizar Compra",
    "checkout.cart_empty": "Seu carrinho está vazio",
    "checkout.proceed": "Prosseguir para Pagamento",
    "checkout.guest": "Continuar como Visitante",
    "checkout.total": "Total",
    "common.loading": "Carregando...",
    "common.error": "Algo deu errado",
    "common.view_all": "Ver Tudo",
    "common.add_to_cart": "Adicionar ao Carrinho",
    "common.buy_tickets": "Comprar Ingressos",
  },
  ht: {
    "nav.home": "Akèy",
    "nav.events": "Evènman",
    "nav.login": "Konekte",
    "nav.signup": "Enskri",
    "nav.profile": "Pwofil",
    "nav.settings": "Paramèt",
    "nav.logout": "Dekonekte",
    "home.hero.title": "Viv Evènman Tankou Jamè Anvan",
    "home.hero.subtitle": "Pòt ou pou eksperyans inoublyab. Gade konsè, festival, espò ak plis.",
    "home.browse_events": "Gade Evènman",
    "home.trending": "Tandans",
    "home.upcoming": "Evènman k ap Vini",
    "events.search": "Chèche evènman...",
    "events.filter": "Filtre",
    "events.no_results": "Pa gen evènman",
    "checkout.title": "Peye",
    "checkout.cart_empty": "Panye ou vid",
    "checkout.proceed": "Kontinye ak Peman",
    "checkout.guest": "Kontinye kòm Envite",
    "checkout.total": "Total",
    "common.loading": "Chaje...",
    "common.error": "Gen yon pwoblèm",
    "common.view_all": "Wè Tout",
    "common.add_to_cart": "Ajoute nan Panye",
    "common.buy_tickets": "Achte Tikè",
  },
  zh: {
    "nav.home": "首页",
    "nav.events": "活动",
    "nav.login": "登录",
    "nav.signup": "注册",
    "nav.profile": "个人资料",
    "nav.settings": "设置",
    "nav.logout": "退出",
    "home.hero.title": "前所未有的活动体验",
    "home.hero.subtitle": "您通往难忘体验的大门。浏览音乐会、节日、体育赛事等。",
    "home.browse_events": "浏览活动",
    "home.trending": "热门趋势",
    "home.upcoming": "即将举行",
    "events.search": "搜索活动...",
    "events.filter": "筛选",
    "events.no_results": "未找到活动",
    "checkout.title": "结账",
    "checkout.cart_empty": "购物车为空",
    "checkout.proceed": "继续付款",
    "checkout.guest": "游客继续",
    "checkout.total": "总计",
    "common.loading": "加载中...",
    "common.error": "出了点问题",
    "common.view_all": "查看全部",
    "common.add_to_cart": "加入购物车",
    "common.buy_tickets": "购买门票",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.events": "الفعاليات",
    "nav.login": "تسجيل الدخول",
    "nav.signup": "إنشاء حساب",
    "nav.profile": "الملف الشخصي",
    "nav.settings": "الإعدادات",
    "nav.logout": "تسجيل الخروج",
    "home.hero.title": "عش الفعاليات كما لم تعشها من قبل",
    "home.hero.subtitle": "بوابتك إلى تجارب لا تُنسى. تصفح الحفلات والمهرجانات والرياضة والمزيد.",
    "home.browse_events": "تصفح الفعاليات",
    "home.trending": "الأكثر رواجاً",
    "home.upcoming": "الفعاليات القادمة",
    "events.search": "البحث عن فعاليات...",
    "events.filter": "تصفية",
    "events.no_results": "لم يتم العثور على فعاليات",
    "checkout.title": "الدفع",
    "checkout.cart_empty": "سلة التسوق فارغة",
    "checkout.proceed": "المتابعة للدفع",
    "checkout.guest": "المتابعة كضيف",
    "checkout.total": "المجموع",
    "common.loading": "جارٍ التحميل...",
    "common.error": "حدث خطأ ما",
    "common.view_all": "عرض الكل",
    "common.add_to_cart": "أضف إلى السلة",
    "common.buy_tickets": "شراء التذاكر",
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey) => string;
  languages: LanguageInfo[];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = localStorage.getItem("eventpro_language");
    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
      return stored as SupportedLanguage;
    }
    // Try to detect browser language
    const browserLang = navigator.language.split("-")[0];
    if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) {
      return browserLang as SupportedLanguage;
    }
    return "en";
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem("eventpro_language", lang);
    // Update HTML dir attribute for RTL languages
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        isRTL,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
