import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import Link from 'next/link';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';

import styles from './privacy.module.css';

const CONTACT_EMAIL = 'geral@shoppingfortaleza.co.ao';
const OFFICIAL_SITE_URL = 'https://shoppingfortaleza.co.ao/';

const policySections = [
  {
    paragraphs: [
      'O Shopping Fortaleza é responsável pelo tratamento dos dados pessoais utilizados nesta aplicação.',
    ],
    title: 'Responsável pelo tratamento',
  },
  {
    bullets: [
      'Dados de conta e perfil: nome, email, telefone e fotografia de perfil.',
      'Dados de fidelização: faturas, imagens submetidas, dados extraídos por OCR ou pelo QR fiscal, loja, valor, data, identificadores, pontos e benefícios.',
      'Dados de utilização: idioma, lojas favoritas, notificações, identificador desta instalação, token de notificações push, sessão e informações técnicas necessárias ao funcionamento e à segurança da aplicação.',
    ],
    title: 'Dados que tratamos',
  },
  {
    bullets: [
      'Criar e proteger a sua conta e manter a sessão iniciada.',
      'Validar faturas, calcular pontos e disponibilizar benefícios.',
      'Apresentar lojas, eventos, favoritos e notificações relevantes.',
      'Prestar suporte, prevenir fraude e proteger a aplicação.',
    ],
    title: 'Como usamos os dados',
  },
  {
    paragraphs: [
      'A câmara e as fotografias são utilizadas apenas após a sua ação e autorização. Ao fotografar uma fatura, a aplicação reconhece o texto por OCR no dispositivo e, quando a fatura tem QR fiscal, envia a imagem e o conteúdo do QR para leitura automática. A imagem e os dados que confirmar são enviados para validação e atribuição de pontos.',
    ],
    title: 'Câmara, fotografias e OCR',
  },
  {
    paragraphs: [
      'Com a sua autorização, a aplicação regista o token de notificações push deste dispositivo para enviar avisos sobre a sua conta, pontos, benefícios e novidades do Shopping Fortaleza. O token é removido quando termina a sessão e pode desativar as notificações a qualquer momento nas definições do dispositivo.',
    ],
    title: 'Notificações',
  },
  {
    paragraphs: [
      'Os dados podem ser tratados por prestadores necessários ao funcionamento, alojamento, segurança e suporte da aplicação, ou quando existir uma obrigação legal. Limitamos a partilha ao necessário para cada finalidade.',
    ],
    title: 'Partilha de dados',
  },
  {
    paragraphs: [
      'Conservamos os dados durante o período necessário às finalidades descritas e às obrigações aplicáveis. São adotadas medidas razoáveis para proteger a informação e as credenciais de sessão.',
    ],
    title: 'Conservação e segurança',
  },
  {
    paragraphs: [
      'Pode atualizar os dados do perfil, gerir as permissões da aplicação nas definições do dispositivo, eliminar a conta na própria aplicação e solicitar acesso, correção ou eliminação dos seus dados através do contacto abaixo.',
    ],
    title: 'Os seus direitos e escolhas',
  },
  {
    paragraphs: [
      'Pode eliminar a sua conta a qualquer momento em Perfil > Segurança e Password > Eliminar conta, confirmando com a sua password e, quando estiver ativo, com o código de autenticação em dois passos.',
      'A eliminação é definitiva: os dados pessoais e os ficheiros associados à conta são removidos e as sessões são terminadas. Os pontos e benefícios por utilizar deixam de estar disponíveis. Os registos contabilísticos do programa de fidelização são conservados de forma pseudonimizada, sem os seus dados de identificação.',
      'Também pode pedir a eliminação da conta através do contacto indicado nesta política.',
    ],
    title: 'Eliminação da conta',
  },
  {
    paragraphs: [
      'Esta política pode ser atualizada para refletir alterações legais, técnicas ou funcionais. A data da versão mais recente será sempre indicada nesta página.',
    ],
    title: 'Alterações a esta política',
  },
] as const;

export const metadata: Metadata = {
  description:
    'Política pública de privacidade dos serviços digitais do Shopping Fortaleza.',
  title: 'Política de Privacidade | Shopping Fortaleza',
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <Link aria-label="Voltar ao login" className={styles.brandLink} href="/login">
            <ShoppingLogo size="sm" />
          </Link>
          <a
            className={styles.officialLink}
            href={OFFICIAL_SITE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Site oficial
            <ExternalLink aria-hidden size={15} strokeWidth={1.7} />
          </a>
        </div>
      </header>

      <article className={styles.document}>
        <Link className={styles.backLink} href="/login">
          <ArrowLeft aria-hidden size={16} strokeWidth={1.7} />
          Voltar ao login
        </Link>

        <header className={styles.intro}>
          <p>Shopping Fortaleza</p>
          <h1>Política de Privacidade</h1>
          <time dateTime="2026-10-27">Última atualização: 27 de outubro de 2026</time>
          <p className={styles.lead}>
            Esta Política de Privacidade explica como o Shopping Fortaleza recolhe,
            utiliza, conserva e protege os dados pessoais tratados pelos seus serviços
            digitais.
          </p>
        </header>

        <div className={styles.sections}>
          {policySections.map((section) => (
            <section className={styles.policySection} key={section.title}>
              <h2>{section.title}</h2>
              {'paragraphs' in section
                ? section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                : null}
              {'bullets' in section ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className={styles.policySection}>
            <h2>Contacto</h2>
            <p>
              Para questões sobre privacidade ou para exercer os seus direitos,
              contacte-nos através do endereço abaixo.
            </p>
            <a className={styles.contactLink} href={`mailto:${CONTACT_EMAIL}`}>
              <Mail aria-hidden size={17} strokeWidth={1.7} />
              {CONTACT_EMAIL}
            </a>
          </section>
        </div>
      </article>

      <footer className={styles.footer}>
        <span>Shopping Fortaleza</span>
        <a href={OFFICIAL_SITE_URL} rel="noopener noreferrer" target="_blank">
          shoppingfortaleza.co.ao
        </a>
      </footer>
    </main>
  );
}
