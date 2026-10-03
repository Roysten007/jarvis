import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
  actionNote: string;
  clientAction?: {
    type: 'open_url';
    url: string;
    label: string;
  };
  details?: {
    to: string;
    subject: string;
    sentDirectly: boolean;
  };
}

const GMAIL_USER = process.env.GMAIL_USER || process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'kihfomwemgkpliww';

/**
 * Envoie un email en tâche de fond via Gmail SMTP ou prépare le lien universel
 */
export async function sendJarvisEmail(payload: EmailPayload): Promise<EmailResult> {
  const { to, subject, body, fromName = 'Roysten KOSSOU // JARVIS' } = payload;
  const cleanTo = to.trim();
  const cleanSubject = subject.trim() || 'Message de Roysten KOSSOU';
  const cleanBody = body.trim();

  // Si le mot de passe d'application Gmail est configuré, envoi 100% autonome en tâche de fond
  if (GMAIL_APP_PASSWORD && GMAIL_APP_PASSWORD.length >= 12) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${GMAIL_USER}>`,
        to: cleanTo,
        subject: cleanSubject,
        text: cleanBody,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${cleanBody.replace(/\n/g, '<br>')}</div>
            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 25px 0 15px 0;">
            <p style="font-size: 11px; color: #64748b; font-family: monospace;">
              Expédié de façon autonome par J.A.R.V.I.S — Assistant Personnel de Roysten KOSSOU.
            </p>
          </div>
        `,
      });

      return {
        success: true,
        actionNote: `Email expédié avec succès à ${cleanTo}.`,
        message: `✉️ **EMAIL EXPÉDIÉ AVEC SUCCÈS** en arrière-plan à **${cleanTo}** !\n\n**Objet :** ${cleanSubject}\n\n> ${cleanBody.slice(0, 150)}${cleanBody.length > 150 ? '...' : ''}`,
        details: {
          to: cleanTo,
          subject: cleanSubject,
          sentDirectly: true,
        },
      };
    } catch (error: any) {
      console.warn('[EMAIL] Échec envoi direct Gmail SMTP:', error.message);
      // Fallback sur le lien universel ci-dessous
    }
  }

  // Fallback universel ultra rapide : Lien direct Gmail Web / Mailto
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanTo)}&su=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(cleanBody)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(cleanBody)}`;

  return {
    success: true,
    actionNote: `Email préparé pour ${cleanTo}.`,
    message:
      `✉️ **EMAIL PRÊPARÉ POUR ${cleanTo.toUpperCase()}**\n\n` +
      `• **Destinataire :** \`${cleanTo}\`\n` +
      `• **Objet :** ${cleanSubject}\n\n` +
      `> ${cleanBody}\n\n` +
      `💡 *Pour activer l'envoi 100% autonome sans les mains : ajoutez simplement votre mot de passe d'application Google (16 caractères généré gratuitement sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)) dans la variable \`GMAIL_APP_PASSWORD\`.*`,
    clientAction: {
      type: 'open_url',
      url: gmailComposeUrl,
      label: `Ouvrir Gmail & Envoyer (${cleanTo})`,
    },
    details: {
      to: cleanTo,
      subject: cleanSubject,
      sentDirectly: false,
    },
  };
}
