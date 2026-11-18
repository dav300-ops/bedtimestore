import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export type EmailLanguage = 'en' | 'ar' | 'ru' | 'fr';

let customTransportOverride: Transporter | null = null;

export function setMailTransportOverride(transport: Transporter | null): void {
  customTransportOverride = transport;
}

function getTransporter(): Transporter {
  if (customTransportOverride) return customTransportOverride;

  if (!config.smtp.user || !config.smtp.appPassword) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    requireTLS: config.smtp.port === 587,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.appPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function normalizeLanguage(lang?: string): EmailLanguage {
  if (lang === 'ar' || lang === 'ru' || lang === 'fr') return lang;
  return 'en';
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface OtpEmailCopy {
  subject: string;
  heading: string;
  subtitle: string;
  codeLabel: string;
  expiryNote: string;
  metaTitle: string;
  timeLabel: string;
  ipLabel: string;
  deviceLabel: string;
  warning: string;
  footer: string;
}

function getOtpCopy(lang: EmailLanguage, expiryMinutes: number): OtpEmailCopy {
  switch (lang) {
    case 'ar':
      return {
        subject: 'رمز التحقق لتسجيل دخول المشرف — ذا بدتايم ستور',
        heading: 'رمز الدخول السريع للمشرف',
        subtitle: 'استخدمي هذا الرمز المكوّن من 6 أرقام لإتمام تسجيل الدخول إلى لوحة التحكم الإدارية.',
        codeLabel: 'رمز التحقق المؤقت',
        expiryNote: `ينتهي هذا الرمز خلال ${expiryMinutes} دقائق وهو صالح لاستخدام واحد فقط.`,
        metaTitle: 'تفاصيل الطلب',
        timeLabel: 'وقت الطلب',
        ipLabel: 'عنوان IP',
        deviceLabel: 'الجهاز والمتصفح',
        warning:
          'إذا لم تطلبي هذا الرمز، يرجى تجاهل هذه الرسالة والتفكير في تغيير كلمة مرور حسابك فوراً.',
        footer: 'ذا بدتايم ستور · مملكة البحرين',
      };
    case 'ru':
      return {
        subject: 'Код входа администратора — Deluxe Bedtime Store',
        heading: 'Код для входа в панель администратора',
        subtitle: 'Введите этот 6-значный код для входа в панель управления бутиком.',
        codeLabel: 'Ваш одноразовый код',
        expiryNote: `Код действителен в течение ${expiryMinutes} минут и предназначен только для одного входа.`,
        metaTitle: 'Сведения о запросе',
        timeLabel: 'Время запроса',
        ipLabel: 'IP-адрес',
        deviceLabel: 'Устройство',
        warning:
          'Если вы не запрашивали этот код, проигнорируйте это письмо и рассмотрите возможность смены пароля.',
        footer: 'Deluxe Bedtime Store · Королевство Бахрейн',
      };
    case 'fr':
      return {
        subject: 'Code de connexion administrateur — Deluxe Bedtime Store',
        heading: 'Votre code de connexion administrateur',
        subtitle: 'Saisissez ce code à 6 chiffres pour accéder au tableau de bord administrateur.',
        codeLabel: 'Code à usage unique',
        expiryNote: `Ce code expire dans ${expiryMinutes} minutes et n’est valable que pour une seule connexion.`,
        metaTitle: 'Détails de la demande',
        timeLabel: 'Heure de la demande',
        ipLabel: 'Adresse IP',
        deviceLabel: 'Appareil',
        warning:
          'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail et envisagez de modifier votre mot de passe.',
        footer: 'Deluxe Bedtime Store · Royaume de Bahreïn',
      };
    case 'en':
    default:
      return {
        subject: 'Admin Sign-In Verification Code — Deluxe Bedtime Store',
        heading: 'Administrator Verification Code',
        subtitle: 'Use this 6-digit single-use code to sign in to the Deluxe Bedtime Store Admin Portal.',
        codeLabel: 'One-Time Verification Code',
        expiryNote: `This code expires in ${expiryMinutes} minutes and can only be used once.`,
        metaTitle: 'Request Details',
        timeLabel: 'Request Time',
        ipLabel: 'IP Address',
        deviceLabel: 'Device / Browser',
        warning:
          "If you didn't request this, ignore this email and consider changing your password.",
        footer: 'Deluxe Bedtime Store · Kingdom of Bahrain',
      };
  }
}

interface LoginAlertCopy {
  subject: string;
  heading: string;
  intro: string;
  metaTitle: string;
  timeLabel: string;
  ipLabel: string;
  deviceLabel: string;
  methodLabel: string;
  methodValue: string;
  advice: string;
  footer: string;
}

function getLoginAlertCopy(lang: EmailLanguage): LoginAlertCopy {
  switch (lang) {
    case 'ar':
      return {
        subject: 'تنبيه أمني: تسجيل دخول جديد إلى حساب المشرف',
        heading: 'تم تسجيل دخول جديد إلى لوحة الإدارة',
        intro: 'تم تسجيل دخول ناجح إلى حساب المشرف الخاص بك في ذا بدتايم ستور.',
        metaTitle: 'بيانات الجلسة',
        timeLabel: 'وقت الدخول',
        ipLabel: 'عنوان IP',
        deviceLabel: 'الجهاز والمتصفح',
        methodLabel: 'طريقة المصادقة',
        methodValue: 'رمز التحقق عبر البريد الإلكتروني (بدون كلمة مرور)',
        advice:
          'إذا لم تقومي بتسجيل الدخول هذا، قومي بتسجيل الخروج فوراً وتغيير كلمة مرورك وتعطيل تسجيل الدخول بالرمز من إعدادات الأمان.',
        footer: 'ذا بدتايم ستور · مملكة البحرين',
      };
    case 'ru':
      return {
        subject: 'Новый вход в ваш аккаунт администратора — Deluxe Bedtime Store',
        heading: 'Выполнен новый вход в панель администратора',
        intro: 'Зафиксирован успешный вход в ваш аккаунт администратора Deluxe Bedtime Store.',
        metaTitle: 'Сведения о входе',
        timeLabel: 'Время входа',
        ipLabel: 'IP-адрес',
        deviceLabel: 'Устройство',
        methodLabel: 'Способ входа',
        methodValue: 'Одноразовый код по электронной почте',
        advice:
          'Если это были не вы, немедленно смените пароль и отключите вход по коду электронной почты в настройках безопасности.',
        footer: 'Deluxe Bedtime Store · Королевство Бахрейн',
      };
    case 'fr':
      return {
        subject: 'Nouvelle connexion à votre compte administrateur — Deluxe Bedtime Store',
        heading: 'Nouvelle connexion administrateur détectée',
        intro: 'Une connexion réussie a été effectuée sur votre compte administrateur Deluxe Bedtime Store.',
        metaTitle: 'Détails de la session',
        timeLabel: 'Heure de connexion',
        ipLabel: 'Adresse IP',
        deviceLabel: 'Appareil',
        methodLabel: 'Méthode',
        methodValue: 'Code e-mail à usage unique',
        advice:
          'Si vous n’êtes pas à l’origine de cette connexion, modifiez immédiatement votre mot de passe et désactivez la connexion par code e-mail.',
        footer: 'Deluxe Bedtime Store · Royaume de Bahreïn',
      };
    case 'en':
    default:
      return {
        subject: 'New sign-in to your admin account — Deluxe Bedtime Store',
        heading: 'New Sign-In to Your Admin Account',
        intro: 'A new administrator session was started on your Deluxe Bedtime Store account.',
        metaTitle: 'Session Details',
        timeLabel: 'Sign-In Time',
        ipLabel: 'IP Address',
        deviceLabel: 'Device / Browser',
        methodLabel: 'Sign-In Method',
        methodValue: 'Email Code (Passwordless OTP)',
        advice:
          'If this was not you, change your password immediately and turn off Email Code Sign-In in your administrator security settings.',
        footer: 'Deluxe Bedtime Store · Kingdom of Bahrain',
      };
  }
}

export async function sendAdminOtpEmail(params: {
  to: string;
  code: string;
  expiryMinutes: number;
  language?: string;
  requestIp: string;
  device: string;
  requestedAt: Date;
}): Promise<void> {
  const lang = normalizeLanguage(params.language);
  const copy = getOtpCopy(lang, params.expiryMinutes);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const formattedTime = params.requestedAt.toUTCString();
  const safeIp = escapeHtml(params.requestIp || 'Unknown');
  const safeDevice = escapeHtml(params.device || 'Web Browser');
  const safeCode = escapeHtml(params.code);

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FBF7EF;font-family:'Montserrat','Segoe UI',Arial,sans-serif;color:#4A3A3D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E6DAD0;border-radius:14px;overflow:hidden;">
    <tr>
      <td style="background-color:#6B0F1F;padding:28px 24px;text-align:center;border-bottom:3px solid #C9A04A;">
        <div style="display:inline-block;padding:6px 14px;border:1px solid #C9A04A;border-radius:999px;background-color:#4A0A15;color:#F7F0E1;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:12px;">
          DELUXE BEDTIME STORE
        </div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#FFFFFF;font-weight:600;">
          ${escapeHtml(copy.heading)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px;text-align:${align};">
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A3A3D;">
          ${escapeHtml(copy.subtitle)}
        </p>
        <div style="background-color:#F7F0E1;border:1px solid #C9A04A;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.6px;color:#7F601A;font-weight:700;margin-bottom:10px;">
            ${escapeHtml(copy.codeLabel)}
          </div>
          <div dir="ltr" style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#4A0A15;background-color:#FFFFFF;border:1px solid #E9D7A8;border-radius:8px;padding:14px 18px;display:inline-block;">
            ${safeCode}
          </div>
          <p style="margin:12px 0 0;font-size:12px;color:#4A3A3D;">
            ${escapeHtml(copy.expiryNote)}
          </p>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FBF7EF;border:1px solid #E6DAD0;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;">
          <tr>
            <td colspan="2" style="padding:0 0 8px;font-weight:700;color:#2A1216;text-transform:uppercase;letter-spacing:1px;font-size:11px;">
              ${escapeHtml(copy.metaTitle)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;width:36%;">${escapeHtml(copy.timeLabel)}:</td>
            <td dir="ltr" style="padding:4px 0;color:#2A1216;font-weight:600;">${escapeHtml(formattedTime)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;">${escapeHtml(copy.ipLabel)}:</td>
            <td dir="ltr" style="padding:4px 0;color:#2A1216;font-family:'Courier New',monospace;">${safeIp}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;">${escapeHtml(copy.deviceLabel)}:</td>
            <td style="padding:4px 0;color:#2A1216;">${safeDevice}</td>
          </tr>
        </table>
        <div style="background-color:#FBE9EA;border:1px solid #E6DAD0;border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.5;color:#2A1216;">
          ${escapeHtml(copy.warning)}
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#4A0A15;padding:14px 24px;text-align:center;color:#F7F0E1;font-size:11px;letter-spacing:1px;">
        ${escapeHtml(copy.footer)}
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    copy.heading,
    '',
    copy.subtitle,
    '',
    `${copy.codeLabel}: ${params.code}`,
    copy.expiryNote,
    '',
    `${copy.timeLabel}: ${formattedTime}`,
    `${copy.ipLabel}: ${params.requestIp}`,
    `${copy.deviceLabel}: ${params.device}`,
    '',
    copy.warning,
    '',
    copy.footer,
  ].join('\n');

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
      to: params.to,
      subject: copy.subject,
      html,
      text,
    });
  } catch (err: any) {
    console.error('[SMTP Delivery Failed - OTP]', {
      code: err?.code || 'SMTP_ERROR',
      responseCode: err?.responseCode,
      message: err?.message || 'Failed to send email',
    });
    const smtpErr: Error & { code?: string } = new Error('SMTP_DELIVERY_FAILED');
    smtpErr.code = 'SMTP_DELIVERY_FAILED';
    throw smtpErr;
  }
}

export async function sendAdminOtpLoginAlertEmail(params: {
  to: string;
  language?: string;
  loginIp: string;
  device: string;
  loginAt: Date;
}): Promise<void> {
  const lang = normalizeLanguage(params.language);
  const copy = getLoginAlertCopy(lang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const formattedTime = params.loginAt.toUTCString();

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FBF7EF;font-family:'Montserrat','Segoe UI',Arial,sans-serif;color:#4A3A3D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E6DAD0;border-radius:14px;overflow:hidden;">
    <tr>
      <td style="background-color:#6B0F1F;padding:24px;text-align:center;border-bottom:3px solid #C9A04A;">
        <div style="display:inline-block;padding:6px 14px;border:1px solid #C9A04A;border-radius:999px;background-color:#4A0A15;color:#F7F0E1;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:10px;">
          DELUXE BEDTIME STORE
        </div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#FFFFFF;font-weight:600;">
          ${escapeHtml(copy.heading)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;text-align:${align};">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4A3A3D;">
          ${escapeHtml(copy.intro)}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F0E1;border:1px solid #E9D7A8;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:12px;">
          <tr>
            <td colspan="2" style="padding:0 0 8px;font-weight:700;color:#2A1216;text-transform:uppercase;letter-spacing:1px;font-size:11px;">
              ${escapeHtml(copy.metaTitle)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;width:36%;">${escapeHtml(copy.timeLabel)}:</td>
            <td dir="ltr" style="padding:4px 0;color:#2A1216;font-weight:600;">${escapeHtml(formattedTime)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;">${escapeHtml(copy.ipLabel)}:</td>
            <td dir="ltr" style="padding:4px 0;color:#2A1216;font-family:'Courier New',monospace;">${escapeHtml(params.loginIp)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;">${escapeHtml(copy.deviceLabel)}:</td>
            <td style="padding:4px 0;color:#2A1216;">${escapeHtml(params.device)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#726265;">${escapeHtml(copy.methodLabel)}:</td>
            <td style="padding:4px 0;color:#6B0F1F;font-weight:600;">${escapeHtml(copy.methodValue)}</td>
          </tr>
        </table>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#4A3A3D;">
          ${escapeHtml(copy.advice)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#4A0A15;padding:14px 24px;text-align:center;color:#F7F0E1;font-size:11px;letter-spacing:1px;">
        ${escapeHtml(copy.footer)}
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    copy.heading,
    '',
    copy.intro,
    '',
    `${copy.timeLabel}: ${formattedTime}`,
    `${copy.ipLabel}: ${params.loginIp}`,
    `${copy.deviceLabel}: ${params.device}`,
    `${copy.methodLabel}: ${copy.methodValue}`,
    '',
    copy.advice,
    '',
    copy.footer,
  ].join('\n');

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`,
      to: params.to,
      subject: copy.subject,
      html,
      text,
    });
  } catch (err: any) {
    console.error('[SMTP Delivery Failed - Sign-in Alert]', {
      code: err?.code || 'SMTP_ERROR',
      message: err?.message || 'Failed to send sign-in notification email',
    });
  }
}
