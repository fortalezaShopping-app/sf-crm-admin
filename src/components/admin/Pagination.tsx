import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  page: number;
  totalItems: number;
  totalPages: number;
};

export function Pagination({
  isLoading = false,
  onPageChange,
  page,
  totalItems,
  totalPages,
}: PaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <nav aria-label="Paginacao da tabela" className="table-pagination">
      <span>
        Pagina {page + 1} de {Math.max(totalPages, 1)} · {totalItems} registos
      </span>
      <div className="table-pagination__actions">
        <button
          aria-label="Pagina anterior"
          className="table-action"
          disabled={isLoading || page <= 0}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden size={15} />
          Anterior
        </button>
        <button
          aria-label="Pagina seguinte"
          className="table-action"
          disabled={isLoading || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Seguinte
          <ChevronRight aria-hidden size={15} />
        </button>
      </div>
    </nav>
  );
}
