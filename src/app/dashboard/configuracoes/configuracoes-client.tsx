'use client';

import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Download, Pencil, TriangleAlert } from 'lucide-react';
import { Modal, Unavailable } from '@/components/admin/Workspace';
import s from '@/components/admin/Workspace.module.css';

const groups = [
  {
    title: 'Programa de pontos',
    rows: [
      ['Fórmula global', 'AOA por ponto'],
      ['Expiração de pontos', 'Meses'],
      ['Nível: Iniciante', 'Limite superior em pontos'],
      ['Nível: Intermédio', 'Limite superior em pontos'],
      ['Nível: Avançado', 'Limite inferior em pontos'],
    ],
  },
  {
    title: 'Validação de talões',
    rows: [
      ['SLA máximo de validação', 'Horas'],
      ['Máximo de ressubmissões', 'Tentativas'],
      ['Arquivo de imagens', 'Dias'],
    ],
  },
  {
    title: 'Notificações',
    rows: [
      ['Janela de envio push', 'Horário'],
      ['Máximo de campanhas por semana', 'Por utilizador'],
    ],
  },
  {
    title: 'QR code',
    rows: [
      ['Validade por defeito', 'Minutos'],
      ['Limite por lojista', 'QR por hora'],
    ],
  },
];
export function ConfiguracoesClient() {
  const [setting, setSetting] = useState<string[] | null>(null);
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Definições</h1>
      </header>
      <div className={s.settings}>
        <Unavailable>Consulta e gravação das definições globais</Unavailable>
        {groups.map((group) => (
          <section key={group.title} className={s.section}>
            <h2>{group.title}</h2>
            {group.rows.map(([label, unit]) => (
              <div className={s.setting} key={label}>
                <span>{label}</span>
                <span className={s.muted}>Não disponibilizado</span>
                <IconButton
                  title={`Editar ${label.toLowerCase()}`}
                  aria-label={`Editar ${label.toLowerCase()}`}
                  onClick={() => setSetting([label, unit])}
                >
                  <Pencil size={16} />
                </IconButton>
              </div>
            ))}
          </section>
        ))}
        <section className={s.section}>
          <h2>Conteúdo da app</h2>
          <div className={s.setting}>
            <span>Banners da página inicial</span>
            <span />
            <Button asChild variant="outline">
              <Link href="/dashboard/carrossel">
                <ArrowUpRight size={16} />
                Gerir banners
              </Link>
            </Button>
          </div>
          <div className={s.setting}>
            <span>Destaques das lojas</span>
            <span />
            <Button asChild variant="outline">
              <Link href="/dashboard/notificacoes">
                <ArrowUpRight size={16} />
                Gerir destaques
              </Link>
            </Button>
          </div>
          <div className={s.setting}>
            <span>Categorias em destaque</span>
            <span className={s.muted}>Indisponível na API</span>
            <IconButton
              disabled
              title="Gestão de categorias indisponível"
              aria-label="Editar categorias em destaque"
            >
              <Pencil size={16} />
            </IconButton>
          </div>
        </section>
        <section className={s.section}>
          <h2>Zona de risco</h2>
          <div className={s.stack}>
            <Button
              variant="destructive"
              disabled
              title="Operação não disponibilizada pela API"
            >
              <TriangleAlert size={16} />
              Repor todos os pontos da plataforma
            </Button>
            <Button
              variant="outline"
              disabled
              title="Exportação global não disponibilizada pela API"
            >
              <Download size={16} />
              Exportar todos os dados
            </Button>
          </div>
        </section>
      </div>
      {setting && (
        <Modal title={setting[0]} onClose={() => setSetting(null)}>
          <form className={s.form} onSubmit={(e) => e.preventDefault()}>
            <Unavailable>Valor atual e gravação desta definição</Unavailable>
            {setting[1] === 'Horário' ? (
              <div className={s.detailGrid}>
                <label>
                  Das
                  <Input type="time" />
                </label>
                <label>
                  Até
                  <Input type="time" />
                </label>
              </div>
            ) : (
              <label>
                {setting[1]}
                <Input type="number" min={1} step={1} required />
              </label>
            )}
            <div className={s.footer}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSetting(null)}
              >
                Cancelar
              </Button>
              <Button variant="default" disabled title="Aguarda suporte da API">
                Guardar definição
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
