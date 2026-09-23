import type { Locale } from "./taxonomy";

/**
 * The activity journal in words.
 *
 * Entries are stored under short codes ("vehicle.status.sold") so the log
 * stays stable whatever language anyone reads it in; this turns each code
 * into a sentence in the reader's language. An unknown code — one added
 * later without a line here — still shows, as itself.
 */

type Row = readonly [string, string, string, string, string, string, string];
// [code, en, fr, de, zh, ar, es]
const ROWS: readonly Row[] = [
  ["auth.login", "Signed in", "Connexion", "Angemeldet", "登录", "تسجيل الدخول", "Inicio de sesión"],
  ["auth.logout", "Signed out", "Déconnexion", "Abgemeldet", "退出登录", "تسجيل الخروج", "Cierre de sesión"],
  ["auth.failed", "Failed sign-in attempt", "Tentative de connexion échouée", "Fehlgeschlagener Anmeldeversuch", "登录失败", "محاولة تسجيل دخول فاشلة", "Intento de inicio de sesión fallido"],

  ["lead.created", "New enquiry", "Nouvelle demande", "Neue Anfrage", "新咨询", "طلب جديد", "Nueva solicitud"],
  ["lead.updated", "Enquiry updated", "Demande mise à jour", "Anfrage aktualisiert", "咨询已更新", "تم تحديث الطلب", "Solicitud actualizada"],
  ["lead.deleted", "Enquiry deleted", "Demande supprimée", "Anfrage gelöscht", "咨询已删除", "تم حذف الطلب", "Solicitud eliminada"],

  ["vehicle.created", "Vehicle added", "Véhicule ajouté", "Fahrzeug hinzugefügt", "已添加车辆", "تمت إضافة سيارة", "Vehículo añadido"],
  ["vehicle.updated", "Vehicle edited", "Véhicule modifié", "Fahrzeug bearbeitet", "已编辑车辆", "تم تعديل السيارة", "Vehículo modificado"],
  ["vehicle.deleted", "Vehicle deleted", "Véhicule supprimé", "Fahrzeug gelöscht", "已删除车辆", "تم حذف السيارة", "Vehículo eliminado"],
  ["vehicle.published", "Vehicle published", "Véhicule publié", "Fahrzeug veröffentlicht", "车辆已发布", "تم نشر السيارة", "Vehículo publicado"],
  ["vehicle.unpublished", "Vehicle taken off the site", "Véhicule retiré du site", "Fahrzeug von der Website genommen", "车辆已下架", "تمت إزالة السيارة من الموقع", "Vehículo retirado del sitio"],
  ["vehicle.status.available", "Vehicle marked available", "Véhicule : disponible", "Fahrzeug: verfügbar", "车辆：在售", "السيارة: متاحة", "Vehículo: disponible"],
  ["vehicle.status.reserved", "Vehicle marked sale in progress", "Véhicule : en cours de vente", "Fahrzeug: Verkauf läuft", "车辆：洽谈中", "السيارة: قيد البيع", "Vehículo: venta en curso"],
  ["vehicle.status.sold", "Vehicle marked sold", "Véhicule : vendu", "Fahrzeug: verkauft", "车辆：已售出", "السيارة: مباعة", "Vehículo: vendido"],
  ["vehicle.status.coming_soon", "Vehicle marked coming soon", "Véhicule : bientôt disponible", "Fahrzeug: demnächst", "车辆：即将上市", "السيارة: قريبًا", "Vehículo: próximamente"],

  ["toy.created", "Big Toy added", "Big Toy ajouté", "Big Toy hinzugefügt", "已添加 Big Toy", "تمت إضافة Big Toy", "Big Toy añadido"],
  ["toy.updated", "Big Toy edited", "Big Toy modifié", "Big Toy bearbeitet", "已编辑 Big Toy", "تم تعديل Big Toy", "Big Toy modificado"],
  ["toy.deleted", "Big Toy deleted", "Big Toy supprimé", "Big Toy gelöscht", "已删除 Big Toy", "تم حذف Big Toy", "Big Toy eliminado"],
  ["toy.published", "Big Toy published", "Big Toy publié", "Big Toy veröffentlicht", "Big Toy 已发布", "تم نشر Big Toy", "Big Toy publicado"],
  ["toy.unpublished", "Big Toy taken off the site", "Big Toy retiré du site", "Big Toy von der Website genommen", "Big Toy 已下架", "تمت إزالة Big Toy من الموقع", "Big Toy retirado del sitio"],
  ["toy.status.available", "Big Toy marked available", "Big Toy : disponible", "Big Toy: verfügbar", "Big Toy：在售", "Big Toy: متاح", "Big Toy: disponible"],
  ["toy.status.reserved", "Big Toy marked sale in progress", "Big Toy : en cours de vente", "Big Toy: Verkauf läuft", "Big Toy：洽谈中", "Big Toy: قيد البيع", "Big Toy: venta en curso"],
  ["toy.status.sold", "Big Toy marked sold", "Big Toy : vendu", "Big Toy: verkauft", "Big Toy：已售出", "Big Toy: مباع", "Big Toy: vendido"],
  ["toy.status.coming_soon", "Big Toy marked coming soon", "Big Toy : bientôt disponible", "Big Toy: demnächst", "Big Toy：即将上市", "Big Toy: قريبًا", "Big Toy: próximamente"],

  ["template.created", "Template saved", "Modèle enregistré", "Vorlage gespeichert", "模板已保存", "تم حفظ القالب", "Plantilla guardada"],
  ["template.deleted", "Template deleted", "Modèle supprimé", "Vorlage gelöscht", "模板已删除", "تم حذف القالب", "Plantilla eliminada"],
  ["toyTemplate.created", "Big Toys template saved", "Modèle Big Toys enregistré", "Big-Toys-Vorlage gespeichert", "Big Toys 模板已保存", "تم حفظ قالب Big Toys", "Plantilla de Big Toys guardada"],
  ["toyTemplate.deleted", "Big Toys template deleted", "Modèle Big Toys supprimé", "Big-Toys-Vorlage gelöscht", "Big Toys 模板已删除", "تم حذف قالب Big Toys", "Plantilla de Big Toys eliminada"],

  ["user.created", "Account created", "Compte créé", "Konto erstellt", "账户已创建", "تم إنشاء الحساب", "Cuenta creada"],
  ["user.updated", "Account edited", "Compte modifié", "Konto bearbeitet", "账户已编辑", "تم تعديل الحساب", "Cuenta modificada"],
  ["user.deleted", "Account deleted", "Compte supprimé", "Konto gelöscht", "账户已删除", "تم حذف الحساب", "Cuenta eliminada"],
  ["user.role", "Role changed", "Rôle modifié", "Rolle geändert", "角色已更改", "تم تغيير الدور", "Rol modificado"],
  ["user.password.reset", "Password reset", "Mot de passe réinitialisé", "Passwort zurückgesetzt", "密码已重置", "تمت إعادة تعيين كلمة المرور", "Contraseña restablecida"],
  ["user.activated", "Account switched on", "Compte réactivé", "Konto aktiviert", "账户已启用", "تم تفعيل الحساب", "Cuenta activada"],
  ["user.deactivated", "Account switched off", "Compte désactivé", "Konto deaktiviert", "账户已停用", "تم إيقاف الحساب", "Cuenta desactivada"],
  ["profile.updated", "Profile edited", "Profil modifié", "Profil bearbeitet", "个人资料已编辑", "تم تعديل الملف الشخصي", "Perfil modificado"],
  ["profile.updated.password", "Own password changed", "Mot de passe personnel changé", "Eigenes Passwort geändert", "已更改本人密码", "تم تغيير كلمة المرور الشخصية", "Contraseña propia cambiada"],

  ["settings.updated", "Settings changed", "Paramètres modifiés", "Einstellungen geändert", "设置已更改", "تم تغيير الإعدادات", "Ajustes modificados"],

  // Arrangements, logged as "update" with the page as the entity.
  ["update:home", "Home page arranged", "Page d'accueil réorganisée", "Startseite angeordnet", "首页已调整", "تم ترتيب الصفحة الرئيسية", "Página de inicio reorganizada"],
  ["update:catalog", "Catalogue order changed", "Ordre du catalogue modifié", "Katalogreihenfolge geändert", "目录排序已更改", "تم تغيير ترتيب الكتالوج", "Orden del catálogo modificado"],
  ["update:big-toys", "Big Toys page arranged", "Page Big Toys réorganisée", "Big-Toys-Seite angeordnet", "Big Toys 页面已调整", "تم ترتيب صفحة Big Toys", "Página Big Toys reorganizada"],
  ["update:about", "About page team changed", "Équipe de la page À propos modifiée", "Team der Über-uns-Seite geändert", "“关于我们”团队已更改", "تم تغيير فريق صفحة من نحن", "Equipo de Quiénes somos modificado"],
];

const INDEX: Record<string, number> = { en: 1, fr: 2, de: 3, zh: 4, ar: 5, es: 6 };
const LABELS = new Map(ROWS.map((row) => [row[0], row]));

export function activityLabel(action: string, entity: string, locale: Locale): string {
  const row = LABELS.get(action === "update" ? `update:${entity}` : action);
  return row ? row[INDEX[locale]] : action;
}

/**
 * Whether an entry's summary is worth showing. Most are names or figures —
 * a car, a person, a city — which read the same in every language. The
 * arrangements, and the About texts, were written as English sentences for
 * the log; their label already says it all.
 */
export function showSummary(action: string, summary: string | null): summary is string {
  if (!summary) return false;
  if (action === "update") return false;
  if (action === "settings.updated" && summary.startsWith("About page:")) return false;
  return true;
}

/** Which family an entry belongs to, for its icon. */
export function activityFamily(action: string, entity: string): "vehicle" | "toy" | "lead" | "user" | "auth" | "settings" | "page" {
  if (action === "update") return entity === "big-toys" ? "toy" : "page";
  const head = action.split(".")[0];
  if (head === "vehicle" || head === "template") return "vehicle";
  if (head === "toy" || head === "toyTemplate") return "toy";
  if (head === "lead") return "lead";
  if (head === "auth") return "auth";
  if (head === "settings") return "settings";
  return "user";
}
