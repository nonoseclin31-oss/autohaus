import type { Company } from "./company";
import type { Locale } from "./taxonomy";

/**
 * The imprint, privacy notice and terms.
 *
 * Built from the company record rather than written into the page, so the day
 * a managing director is appointed or a VAT number arrives, the back office
 * fills it in and all six languages follow.
 *
 * What is not known is said to be not known. A legally required detail that is
 * missing is worse hidden than shown as outstanding, because only the visible
 * gap gets filled.
 */

export type LegalSection = { heading: string; lines: string[] };

const MISSING: Record<string, string> = {
  en: "to be completed",
  fr: "à compléter",
  de: "noch einzutragen",
  es: "pendiente de completar",
  zh: "待补充",
  ar: "بانتظار الاستكمال",
};

const L = {
  en: {
    identity: "Company", represented: "Represented by", register: "Register",
    vat: "VAT identification number", contact: "Contact", phone: "Telephone", email: "E-mail",
    dispute: "Consumer dispute resolution",
    disputeBody:
      "The European Commission provides a platform for online dispute resolution at ec.europa.eu/consumers/odr. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.",
    controller: "Who is responsible",
    controllerBody: "The company named above is the controller for the personal data processed through this website.",
    whatWeCollect: "What we collect, and why",
    whatWeCollectBody:
      "The enquiry forms ask for a name, an e-mail address, optionally a telephone number and company, and your message. They are processed to answer the enquiry — the legal basis is the steps taken at your request before entering into a contract, and our legitimate interest in replying to you.",
    quoteBody:
      "When you send a finance enquiry, the terms you configured travel with it — the formula, the term, the annual mileage, any deposit and the monthly the page calculated — so that the advisor answers the offer you were looking at.",
    logs: "Server logs",
    logsBody:
      "Our host records the usual technical data for each request: IP address, time, the page requested, the referring page and the browser identification. This is used to operate and secure the site and is not combined with the enquiry data.",
    retention: "How long we keep it",
    retentionBody:
      "Enquiries are kept as long as the business relationship requires, and afterwards for the periods commercial and tax law prescribe. Server logs are kept for a short period and then deleted.",
    processors: "Who else sees it",
    processorsBody:
      "The site is hosted by Cloudflare and the data is stored in a managed PostgreSQL database operated by Neon, both under data processing agreements. Uploaded photographs are stored with Cloudflare. No data is sold, and none is passed to third parties for advertising.",
    noTracking: "No tracking",
    noTrackingBody:
      "There is no analytics, no advertising pixel and no social media plug-in on this site. Fonts are served from our own servers, not from a third party, so displaying a page sends nothing to anyone else.",
    mapsHeading: "Map",
    mapsBody:
      "The contact page can show a Google map. It stays switched off until you ask for it, because loading it sends your IP address to Google. If you click to load it, Google's privacy notice applies.",
    rights: "Your rights",
    rightsBody:
      "You may ask what we hold about you, have it corrected or erased, have its processing restricted, receive it in a portable form, and object to processing based on legitimate interest. You may also complain to a supervisory authority.",
    rightsHow: "Write to the address above, or to the e-mail address above.",
    cookiesHeading: "Cookies",
    cookiesIntro: "This site uses one cookie, and it is not used to track anyone.",
    cookieSession:
      "A session cookie is set only when a member of staff signs in to the back office. It holds a signed token identifying the account, lasts seven days, and is removed on sign-out. Visitors to the public site never receive it.",
    cookieTheme:
      "Your choice of light or dark theme is kept in your browser's local storage — not a cookie, never sent to us, and readable only by this site on this device.",
    cookieConsent:
      "Because nothing here measures, profiles or advertises, there is no consent banner: there is nothing to consent to. Should that ever change, you will be asked first.",
    termsScope: "Scope",
    termsScopeBody:
      "These terms apply to the use of this website. A sale or a rental is governed by the contract signed for it.",
    termsListings: "Listings and prices",
    termsListingsBody:
      "Vehicle descriptions, prices and availability shown here are indicative and do not constitute a binding offer. Errors and prior sale excepted. A contract comes into being only once both parties have signed.",
    termsQuotes: "Calculated offers",
    termsQuotesBody:
      "Monthly figures produced by the finance simulator are estimates based on the parameters you set and on standard assumptions about residual value and rate. They are not a credit offer, and any agreement is subject to acceptance of the file.",
    termsLaw: "Applicable law",
    termsLawBody: "German law applies. The place of jurisdiction is the registered seat of the company, as far as the law permits.",
  },
  de: {
    identity: "Unternehmen", represented: "Vertreten durch", register: "Register",
    vat: "Umsatzsteuer-Identifikationsnummer", contact: "Kontakt", phone: "Telefon", email: "E-Mail",
    dispute: "Verbraucherstreitbeilegung",
    disputeBody:
      "Die Europäische Kommission stellt unter ec.europa.eu/consumers/odr eine Plattform zur Online-Streitbeilegung bereit. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir weder verpflichtet noch bereit.",
    controller: "Verantwortlich",
    controllerBody: "Verantwortlich für die über diese Website verarbeiteten personenbezogenen Daten ist das oben genannte Unternehmen.",
    whatWeCollect: "Was wir erheben, und wozu",
    whatWeCollectBody:
      "Die Formulare fragen nach Name und E-Mail-Adresse, wahlweise nach Telefonnummer und Firma, sowie nach Ihrer Nachricht. Diese Daten dienen der Beantwortung Ihrer Anfrage — Rechtsgrundlage sind die auf Ihr Verlangen erfolgten vorvertraglichen Maßnahmen sowie unser berechtigtes Interesse, Ihnen zu antworten.",
    quoteBody:
      "Bei einer Finanzierungsanfrage werden die von Ihnen eingestellten Konditionen mitgesendet — Formel, Laufzeit, Jahreslaufleistung, eine etwaige Anzahlung und die berechnete Rate —, damit Ihr Berater genau das Angebot beantwortet, das Sie vor sich hatten.",
    logs: "Server-Protokolle",
    logsBody:
      "Unser Hoster protokolliert zu jeder Anfrage die üblichen technischen Daten: IP-Adresse, Zeitpunkt, aufgerufene Seite, verweisende Seite und Browserkennung. Sie dienen dem Betrieb und der Sicherheit der Website und werden nicht mit den Anfragedaten zusammengeführt.",
    retention: "Speicherdauer",
    retentionBody:
      "Anfragen werden so lange aufbewahrt, wie es die Geschäftsbeziehung erfordert, danach für die handels- und steuerrechtlich vorgeschriebenen Fristen. Server-Protokolle werden nur kurz vorgehalten und anschließend gelöscht.",
    processors: "Wer sonst Zugriff hat",
    processorsBody:
      "Die Website wird von Cloudflare gehostet, die Daten liegen in einer von Neon betriebenen PostgreSQL-Datenbank; mit beiden bestehen Auftragsverarbeitungsverträge. Hochgeladene Fotos werden bei Cloudflare gespeichert. Es werden keine Daten verkauft und keine zu Werbezwecken an Dritte weitergegeben.",
    noTracking: "Kein Tracking",
    noTrackingBody:
      "Diese Website enthält keine Reichweitenmessung, kein Werbe-Pixel und kein Social-Media-Plug-in. Schriften werden von unseren eigenen Servern ausgeliefert und nicht von Dritten: der Aufruf einer Seite sendet niemandem sonst etwas.",
    mapsHeading: "Karte",
    mapsBody:
      "Auf der Kontaktseite lässt sich eine Google-Karte anzeigen. Sie bleibt ausgeschaltet, bis Sie sie anfordern, denn ihr Laden übermittelt Ihre IP-Adresse an Google. Klicken Sie sie an, gilt die Datenschutzerklärung von Google.",
    rights: "Ihre Rechte",
    rightsBody:
      "Sie können Auskunft über die zu Ihnen gespeicherten Daten verlangen, deren Berichtigung oder Löschung, die Einschränkung der Verarbeitung, die Herausgabe in einem übertragbaren Format sowie Widerspruch gegen eine auf berechtigtem Interesse beruhende Verarbeitung. Ebenso steht Ihnen die Beschwerde bei einer Aufsichtsbehörde offen.",
    rightsHow: "Schreiben Sie an die oben genannte Anschrift oder E-Mail-Adresse.",
    cookiesHeading: "Cookies",
    cookiesIntro: "Diese Website setzt ein einziges Cookie, und es dient nicht dazu, jemanden zu verfolgen.",
    cookieSession:
      "Ein Sitzungs-Cookie wird nur gesetzt, wenn sich ein Mitarbeiter am Back-Office anmeldet. Es enthält ein signiertes Token zur Kennung des Kontos, gilt sieben Tage und verschwindet beim Abmelden. Besucher der öffentlichen Seiten erhalten es nie.",
    cookieTheme:
      "Ihre Wahl zwischen hellem und dunklem Design liegt im lokalen Speicher Ihres Browsers — kein Cookie, wird uns nie übermittelt und ist nur von dieser Website auf diesem Gerät lesbar.",
    cookieConsent:
      "Da hier nichts gemessen, profiliert oder beworben wird, gibt es kein Einwilligungsbanner: es gibt nichts einzuwilligen. Sollte sich das ändern, werden Sie vorher gefragt.",
    termsScope: "Geltungsbereich",
    termsScopeBody:
      "Diese Bedingungen gelten für die Nutzung dieser Website. Für einen Kauf oder eine Miete gilt der dafür geschlossene Vertrag.",
    termsListings: "Angebote und Preise",
    termsListingsBody:
      "Fahrzeugbeschreibungen, Preise und Verfügbarkeiten sind unverbindlich und stellen kein bindendes Angebot dar. Irrtum und Zwischenverkauf vorbehalten. Ein Vertrag kommt erst mit beiderseitiger Unterzeichnung zustande.",
    termsQuotes: "Berechnete Angebote",
    termsQuotesBody:
      "Die vom Rechner ausgewiesenen Raten sind Schätzungen auf Grundlage der von Ihnen gewählten Parameter sowie üblicher Annahmen zu Restwert und Zinssatz. Sie sind kein Kreditangebot; jeder Abschluss steht unter dem Vorbehalt der Bonitätsprüfung.",
    termsLaw: "Anwendbares Recht",
    termsLawBody: "Es gilt deutsches Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Unternehmens.",
  },
  fr: {
    identity: "Société", represented: "Représentée par", register: "Registre",
    vat: "Numéro de TVA intracommunautaire", contact: "Contact", phone: "Téléphone", email: "E-mail",
    dispute: "Règlement des litiges de consommation",
    disputeBody:
      "La Commission européenne met à disposition une plateforme de règlement en ligne des litiges à l'adresse ec.europa.eu/consumers/odr. Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement devant un organe de médiation de la consommation.",
    controller: "Responsable du traitement",
    controllerBody: "La société désignée ci-dessus est responsable du traitement des données personnelles collectées via ce site.",
    whatWeCollect: "Ce que nous collectons, et pourquoi",
    whatWeCollectBody:
      "Les formulaires demandent un nom, une adresse e-mail, éventuellement un téléphone et une société, ainsi que votre message. Ces données servent à répondre à votre demande — la base légale étant les mesures précontractuelles prises à votre demande, et notre intérêt légitime à vous répondre.",
    quoteBody:
      "Lorsque vous envoyez une demande de financement, les paramètres que vous avez configurés l'accompagnent — formule, durée, kilométrage annuel, apport éventuel et loyer calculé — afin que le conseiller réponde à l'offre que vous aviez sous les yeux.",
    logs: "Journaux du serveur",
    logsBody:
      "Notre hébergeur enregistre pour chaque requête les données techniques habituelles : adresse IP, horodatage, page demandée, page d'origine et identification du navigateur. Elles servent à exploiter et sécuriser le site et ne sont pas rapprochées des demandes.",
    retention: "Durée de conservation",
    retentionBody:
      "Les demandes sont conservées le temps nécessaire à la relation commerciale, puis pendant les durées imposées par le droit commercial et fiscal. Les journaux du serveur sont conservés brièvement puis supprimés.",
    processors: "Qui d'autre y a accès",
    processorsBody:
      "Le site est hébergé par Cloudflare et les données sont stockées dans une base PostgreSQL gérée par Neon, l'un et l'autre liés par un contrat de sous-traitance. Les photos envoyées sont stockées chez Cloudflare. Aucune donnée n'est vendue ni transmise à des tiers à des fins publicitaires.",
    noTracking: "Aucun traçage",
    noTrackingBody:
      "Ce site ne comporte ni outil de mesure d'audience, ni pixel publicitaire, ni module de réseau social. Les polices sont servies depuis nos propres serveurs et non par un tiers : afficher une page n'envoie rien à personne d'autre.",
    mapsHeading: "Carte",
    mapsBody:
      "La page contact peut afficher une carte Google. Elle reste désactivée tant que vous ne la demandez pas, car son chargement transmet votre adresse IP à Google. Si vous choisissez de l'afficher, la politique de confidentialité de Google s'applique.",
    rights: "Vos droits",
    rightsBody:
      "Vous pouvez demander quelles données nous détenons, les faire rectifier ou effacer, en faire limiter le traitement, les recevoir dans un format portable, et vous opposer à un traitement fondé sur l'intérêt légitime. Vous pouvez également saisir une autorité de contrôle.",
    rightsHow: "Écrivez à l'adresse postale ou à l'adresse e-mail indiquées ci-dessus.",
    cookiesHeading: "Cookies",
    cookiesIntro: "Ce site utilise un seul cookie, et il ne sert à suivre personne.",
    cookieSession:
      "Un cookie de session n'est déposé que lorsqu'un membre du personnel se connecte au back-office. Il contient un jeton signé identifiant le compte, dure sept jours et disparaît à la déconnexion. Les visiteurs du site public ne le reçoivent jamais.",
    cookieTheme:
      "Votre choix de thème clair ou sombre est conservé dans le stockage local de votre navigateur — ce n'est pas un cookie, il ne nous est jamais transmis, et seul ce site peut le lire sur cet appareil.",
    cookieConsent:
      "Comme rien ici ne mesure, ne profile ni ne fait de publicité, il n'y a pas de bandeau de consentement : il n'y a rien à consentir. Si cela devait changer, votre accord serait demandé au préalable.",
    termsScope: "Objet",
    termsScopeBody:
      "Les présentes conditions régissent l'utilisation de ce site. Une vente ou une location est régie par le contrat signé à cet effet.",
    termsListings: "Annonces et prix",
    termsListingsBody:
      "Les descriptions, prix et disponibilités présentés ici sont indicatifs et ne constituent pas une offre ferme. Sauf erreur et vente intermédiaire. Le contrat n'est formé qu'après signature par les deux parties.",
    termsQuotes: "Offres calculées",
    termsQuotesBody:
      "Les loyers issus du simulateur sont des estimations fondées sur les paramètres que vous choisissez et sur des hypothèses standard de valeur résiduelle et de taux. Ils ne constituent pas une offre de crédit, et tout accord reste soumis à l'acceptation du dossier.",
    termsLaw: "Droit applicable",
    termsLawBody: "Le droit allemand s'applique. Le tribunal compétent est celui du siège social, dans la mesure permise par la loi.",
  },
  es: {
    identity: "Sociedad", represented: "Representada por", register: "Registro",
    vat: "Número de IVA intracomunitario", contact: "Contacto", phone: "Teléfono", email: "Correo electrónico",
    dispute: "Resolución de litigios de consumo",
    disputeBody: "La Comisión Europea ofrece una plataforma de resolución de litigios en línea en ec.europa.eu/consumers/odr. No estamos obligados ni dispuestos a participar en un procedimiento ante un organismo de arbitraje de consumo.",
    controller: "Responsable del tratamiento",
    controllerBody: "La sociedad indicada arriba es responsable del tratamiento de los datos personales recogidos a través de este sitio.",
    whatWeCollect: "Qué recogemos, y para qué",
    whatWeCollectBody: "Los formularios piden un nombre, un correo electrónico, opcionalmente un teléfono y una empresa, y su mensaje. Se tratan para responder a su solicitud — la base jurídica son las medidas precontractuales adoptadas a petición suya y nuestro interés legítimo en responderle.",
    quoteBody: "Al enviar una solicitud de financiación, las condiciones que usted configuró viajan con ella — fórmula, duración, kilometraje anual, entrada y cuota calculada — para que el asesor responda a la oferta que tenía delante.",
    logs: "Registros del servidor",
    logsBody: "Nuestro proveedor registra en cada petición los datos técnicos habituales: dirección IP, momento, página solicitada, página de origen e identificación del navegador. Sirven para operar y proteger el sitio y no se cruzan con los datos de las solicitudes.",
    retention: "Plazo de conservación",
    retentionBody: "Las solicitudes se conservan mientras lo exija la relación comercial y, después, durante los plazos que imponen la legislación mercantil y fiscal. Los registros del servidor se conservan brevemente y se eliminan.",
    processors: "Quién más accede",
    processorsBody: "El sitio está alojado por Cloudflare y los datos residen en una base PostgreSQL gestionada por Neon, ambos con contrato de encargo de tratamiento. Las fotografías subidas se almacenan en Cloudflare. No se venden datos ni se ceden a terceros con fines publicitarios.",
    noTracking: "Sin seguimiento",
    noTrackingBody: "Este sitio no tiene analítica, ni píxel publicitario, ni complementos de redes sociales. Las tipografías se sirven desde nuestros propios servidores y no desde un tercero: abrir una página no envía nada a nadie más.",
    mapsHeading: "Mapa",
    mapsBody: "La página de contacto puede mostrar un mapa de Google. Permanece desactivado hasta que usted lo solicita, porque cargarlo transmite su dirección IP a Google. Si decide mostrarlo, se aplica la política de privacidad de Google.",
    rights: "Sus derechos",
    rightsBody: "Puede solicitar qué datos tenemos sobre usted, su rectificación o supresión, la limitación del tratamiento, recibirlos en un formato portátil y oponerse a un tratamiento basado en el interés legítimo. También puede presentar una reclamación ante una autoridad de control.",
    rightsHow: "Escriba a la dirección postal o al correo electrónico indicados arriba.",
    cookiesHeading: "Cookies",
    cookiesIntro: "Este sitio utiliza una sola cookie, y no sirve para seguir a nadie.",
    cookieSession: "Solo se instala una cookie de sesión cuando un miembro del personal inicia sesión en el back-office. Contiene un token firmado que identifica la cuenta, dura siete días y desaparece al cerrar sesión. Los visitantes del sitio público nunca la reciben.",
    cookieTheme: "Su elección de tema claro u oscuro se guarda en el almacenamiento local del navegador — no es una cookie, nunca nos llega y solo este sitio puede leerla en este dispositivo.",
    cookieConsent: "Como aquí nada mide, perfila ni publicita, no hay banner de consentimiento: no hay nada que consentir. Si eso cambiara, se le pediría permiso antes.",
    termsScope: "Objeto",
    termsScopeBody: "Estas condiciones rigen el uso de este sitio web. Una venta o un alquiler se rigen por el contrato firmado a tal efecto.",
    termsListings: "Anuncios y precios",
    termsListingsBody: "Las descripciones, precios y disponibilidades aquí mostrados son orientativos y no constituyen una oferta en firme. Salvo error y venta previa. El contrato solo se perfecciona tras la firma de ambas partes.",
    termsQuotes: "Ofertas calculadas",
    termsQuotesBody: "Las cuotas del simulador son estimaciones basadas en los parámetros que usted elige y en hipótesis estándar de valor residual y tipo de interés. No constituyen una oferta de crédito y todo acuerdo queda sujeto a la aceptación del expediente.",
    termsLaw: "Ley aplicable",
    termsLawBody: "Se aplica el derecho alemán. El fuero competente es el del domicilio social, en la medida en que la ley lo permita.",
  },
  zh: {
    identity: "公司", represented: "法定代表", register: "商业登记",
    vat: "增值税识别号", contact: "联系方式", phone: "电话", email: "电子邮箱",
    dispute: "消费争议解决",
    disputeBody: "欧盟委员会在 ec.europa.eu/consumers/odr 提供在线争议解决平台。我们既无义务、也不打算参与消费者仲裁机构的争议解决程序。",
    controller: "数据控制者",
    controllerBody: "上述公司为通过本网站处理的个人数据的控制者。",
    whatWeCollect: "我们收集什么，以及为什么",
    whatWeCollectBody: "表单会询问姓名、电子邮箱，可选填电话与公司名称，以及您的留言。这些数据用于回复您的咨询——法律依据为应您要求采取的缔约前措施，以及我们回复您的正当利益。",
    quoteBody: "当您提交融资咨询时，您所设定的条件会一并发送——方案、租期、年里程、首付与页面计算出的月供——以便顾问回复您当时看到的那份报价。",
    logs: "服务器日志",
    logsBody: "我们的托管商会为每次请求记录常规技术数据：IP 地址、时间、所请求页面、来源页面与浏览器标识。这些数据用于网站运行与安全，不与咨询数据关联。",
    retention: "保存期限",
    retentionBody: "咨询记录在业务关系存续期间保存，之后按商法与税法规定的期限保存。服务器日志短期保存后即删除。",
    processors: "还有谁能接触到",
    processorsBody: "网站由 Cloudflare 托管，数据存放于 Neon 运营的 PostgreSQL 数据库，双方均签有数据处理协议。上传的照片存储于 Cloudflare。我们不出售任何数据，也不为广告目的向第三方提供。",
    noTracking: "无追踪",
    noTrackingBody: "本网站没有流量统计、没有广告像素、没有社交媒体插件。字体由我们自己的服务器提供而非第三方：打开页面不会向任何其他方发送数据。",
    mapsHeading: "地图",
    mapsBody: "联系页面可显示 Google 地图。在您主动点击之前它不会加载，因为加载会将您的 IP 地址发送给 Google。若您选择加载，则适用 Google 的隐私政策。",
    rights: "您的权利",
    rightsBody: "您可以查询我们持有的关于您的数据，要求更正或删除，要求限制处理，以可携格式获取，并对基于正当利益的处理提出反对。您也可以向监管机构投诉。",
    rightsHow: "请写信至上述通信地址或电子邮箱。",
    cookiesHeading: "Cookie",
    cookiesIntro: "本网站只使用一个 Cookie，且不用于追踪任何人。",
    cookieSession: "只有当员工登录后台时才会设置会话 Cookie。它包含一个标识账户的签名令牌，有效期七天，退出登录即消失。公开网站的访客永远不会收到它。",
    cookieTheme: "您选择的浅色或深色主题保存在浏览器的本地存储中——这不是 Cookie，从不发送给我们，且只有本网站能在本设备上读取。",
    cookieConsent: "由于这里没有任何测量、画像或广告，因此没有同意横幅：没有需要您同意的内容。若日后有所改变，我们会事先征求您的同意。",
    termsScope: "适用范围",
    termsScopeBody: "本条款适用于本网站的使用。买卖或租赁则以为此签署的合同为准。",
    termsListings: "车辆信息与价格",
    termsListingsBody: "此处展示的车辆描述、价格与库存状况仅供参考，不构成具有约束力的要约。如有错误或中途售出，恕不另行通知。合同须经双方签署后方告成立。",
    termsQuotes: "计算所得的报价",
    termsQuotesBody: "模拟器给出的月供为估算值，基于您设定的参数以及关于残值与利率的通用假设。它不构成信贷要约，任何协议均以审批通过为前提。",
    termsLaw: "适用法律",
    termsLawBody: "适用德国法律。在法律允许的范围内，以公司注册地法院为管辖法院。",
  },
  ar: {
    identity: "الشركة", represented: "يمثّلها", register: "السجل التجاري",
    vat: "رقم التعريف الضريبي", contact: "التواصل", phone: "الهاتف", email: "البريد الإلكتروني",
    dispute: "تسوية نزاعات المستهلك",
    disputeBody: "توفّر المفوضية الأوروبية منصّة لتسوية النزاعات عبر الإنترنت على ec.europa.eu/consumers/odr. ولسنا ملزَمين بالمشاركة في إجراءات التسوية أمام هيئة تحكيم استهلاكية ولا نعتزم ذلك.",
    controller: "المسؤول عن المعالجة",
    controllerBody: "الشركة المذكورة أعلاه هي المسؤولة عن معالجة البيانات الشخصية المجمّعة عبر هذا الموقع.",
    whatWeCollect: "ما الذي نجمعه، ولماذا",
    whatWeCollectBody: "تطلب النماذج الاسم والبريد الإلكتروني، واختياريًا رقم الهاتف واسم الشركة، إضافة إلى رسالتك. وتُعالَج هذه البيانات للردّ على طلبك — والأساس القانوني هو التدابير السابقة للتعاقد المتّخذة بناءً على طلبك، ومصلحتنا المشروعة في الردّ عليك.",
    quoteBody: "عند إرسال طلب تمويل، تُرسَل معه الشروط التي حدّدتها — الصيغة والمدة والمسافة السنوية والدفعة الأولى والقسط المحتسَب — كي يردّ المستشار على العرض نفسه الذي كان أمامك.",
    logs: "سجلات الخادم",
    logsBody: "يسجّل مزوّد الاستضافة لكل طلب البيانات التقنية المعتادة: عنوان IP، والوقت، والصفحة المطلوبة، وصفحة الإحالة، ومعرّف المتصفح. وتُستخدم لتشغيل الموقع وتأمينه ولا تُربط ببيانات الطلبات.",
    retention: "مدة الحفظ",
    retentionBody: "تُحفظ الطلبات طوال ما تقتضيه العلاقة التجارية، ثم للمدد التي يفرضها القانون التجاري والضريبي. أما سجلات الخادم فتُحفظ لفترة قصيرة ثم تُحذف.",
    processors: "من يطّلع عليها أيضًا",
    processorsBody: "الموقع مستضاف لدى Cloudflare، والبيانات مخزّنة في قاعدة PostgreSQL تديرها Neon، ومع كليهما عقد لمعالجة البيانات. وتُخزَّن الصور المرفوعة لدى Cloudflare. ولا تُباع أي بيانات ولا تُنقَل إلى أطراف ثالثة لأغراض إعلانية.",
    noTracking: "بلا تتبّع",
    noTrackingBody: "لا يتضمّن هذا الموقع أدوات قياس، ولا بكسل إعلانات، ولا إضافات تواصل اجتماعي. وتُقدَّم الخطوط من خوادمنا لا من طرف ثالث: فتح الصفحة لا يُرسل شيئًا إلى أحد سوانا.",
    mapsHeading: "الخريطة",
    mapsBody: "يمكن لصفحة التواصل عرض خريطة Google. وتبقى معطّلة حتى تطلبها، لأن تحميلها يُرسل عنوان IP الخاص بك إلى Google. وإن اخترت عرضها، فتسري سياسة الخصوصية الخاصة بـ Google.",
    rights: "حقوقك",
    rightsBody: "يحقّ لك الاطّلاع على بياناتك لدينا، وتصحيحها أو محوها، وتقييد معالجتها، والحصول عليها بصيغة قابلة للنقل، والاعتراض على معالجة تستند إلى المصلحة المشروعة. كما يحقّ لك تقديم شكوى إلى هيئة رقابية.",
    rightsHow: "راسِلنا على العنوان البريدي أو البريد الإلكتروني المذكورَين أعلاه.",
    cookiesHeading: "ملفات تعريف الارتباط",
    cookiesIntro: "يستخدم هذا الموقع ملفًا واحدًا فقط، وهو لا يُستخدم لتتبّع أحد.",
    cookieSession: "يُنشأ ملف الجلسة فقط عند تسجيل أحد الموظفين دخوله إلى لوحة الإدارة. ويحتوي على رمز موقَّع يعرّف الحساب، ومدّته سبعة أيام، ويزول عند تسجيل الخروج. أما زوّار الموقع العام فلا يتلقّونه أبدًا.",
    cookieTheme: "يُحفظ اختيارك للمظهر الفاتح أو الداكن في التخزين المحلي لمتصفحك — وهو ليس ملف تعريف ارتباط، ولا يصلنا أبدًا، ولا يقرؤه سوى هذا الموقع على هذا الجهاز.",
    cookieConsent: "بما أنه لا شيء هنا يقيس أو يصنّف أو يُعلن، فلا يوجد شريط موافقة: لا شيء يستدعي موافقتك. وإن تغيّر ذلك يومًا، سنطلب إذنك مسبقًا.",
    termsScope: "النطاق",
    termsScopeBody: "تحكم هذه الشروط استخدام هذا الموقع. أما البيع أو التأجير فيحكمه العقد الموقَّع لهذا الغرض.",
    termsListings: "الإعلانات والأسعار",
    termsListingsBody: "أوصاف السيارات والأسعار وحالة التوفّر المعروضة هنا إرشادية ولا تشكّل عرضًا مُلزِمًا، مع مراعاة الخطأ والبيع المسبق. ولا ينعقد العقد إلا بتوقيع الطرفين.",
    termsQuotes: "العروض المحتسَبة",
    termsQuotesBody: "الأقساط الناتجة عن الحاسبة تقديرية، مبنية على المعطيات التي تختارها وعلى افتراضات معيارية للقيمة المتبقية ونسبة التمويل. وهي ليست عرض ائتمان، ويظل أي اتفاق مرهونًا بقبول الملف.",
    termsLaw: "القانون الواجب التطبيق",
    termsLawBody: "يسري القانون الألماني. والاختصاص القضائي لمقرّ الشركة، في حدود ما يسمح به القانون.",
  },
};

type Texts = { [K in keyof (typeof L)["en"]]: string };

/** Locales without their own text fall back to English, never to nothing. */
function textsFor(locale: Locale): Texts {
  return ((L as Record<string, Texts | undefined>)[locale] ?? L.en) as Texts;
}

function missingFor(locale: Locale): string {
  return MISSING[locale] ?? MISSING.en;
}

function orMissing(value: string, locale: Locale): string {
  return value.trim() ? value : `— ${missingFor(locale)} —`;
}

export function imprintSections(company: Company, locale: Locale): LegalSection[] {
  const t = textsFor(locale);
  const missing = (value: string) => orMissing(value, locale);

  return [
    {
      heading: t.identity,
      lines: [
        company.legalName,
        company.street,
        `${company.postalCode} ${company.city}`,
        company.country,
      ],
    },
    { heading: t.represented, lines: [missing(company.managingDirector)] },
    {
      heading: t.register,
      lines: [missing(company.registerCourt), missing(company.registerNumber)],
    },
    { heading: t.vat, lines: [missing(company.vatId)] },
    { heading: t.contact, lines: [`${t.phone}: ${company.phone}`, `${t.email}: ${company.email}`] },
    { heading: t.dispute, lines: [t.disputeBody] },
  ];
}

export function privacySections(company: Company, locale: Locale): LegalSection[] {
  const t = textsFor(locale);
  return [
    {
      heading: t.controller,
      lines: [
        t.controllerBody,
        company.legalName,
        `${company.street}, ${company.postalCode} ${company.city}`,
        company.email,
      ],
    },
    { heading: t.whatWeCollect, lines: [t.whatWeCollectBody, t.quoteBody] },
    { heading: t.logs, lines: [t.logsBody] },
    { heading: t.retention, lines: [t.retentionBody] },
    { heading: t.processors, lines: [t.processorsBody] },
    { heading: t.noTracking, lines: [t.noTrackingBody] },
    { heading: t.mapsHeading, lines: [t.mapsBody] },
    { heading: t.cookiesHeading, lines: [t.cookiesIntro, t.cookieSession, t.cookieTheme, t.cookieConsent] },
    { heading: t.rights, lines: [t.rightsBody, t.rightsHow] },
  ];
}

export function termsSections(_company: Company, locale: Locale): LegalSection[] {
  const t = textsFor(locale);
  return [
    { heading: t.termsScope, lines: [t.termsScopeBody] },
    { heading: t.termsListings, lines: [t.termsListingsBody] },
    { heading: t.termsQuotes, lines: [t.termsQuotesBody] },
    { heading: t.termsLaw, lines: [t.termsLawBody] },
  ];
}
