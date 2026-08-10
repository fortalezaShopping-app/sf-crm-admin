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

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav aria-label="Paginação da tabela" className="table-pagination">
      <span>
        Página {page + 1} de {Math.max(totalPages, 1)} · {totalItems} registos
      </span>
      <div className="table-pagination__actions">
        <button
          aria-label="Página anterior"
          className="table-page-button"
          disabled={isLoading || page <= 0}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden size={15} />
        </button>

        {visiblePages.map((pageNumber) => (
          <button
            aria-current={pageNumber === page ? 'page' : undefined}
            aria-label={`Ir para a página ${pageNumber + 1}`}
            className={
              pageNumber === page
                ? 'table-page-button table-page-button--active'
                : 'table-page-button'
            }
            disabled={isLoading}
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            type="button"
          >
            {pageNumber + 1}
          </button>
        ))}

        <button
          aria-label="Página seguinte"
          className="table-page-button"
          disabled={isLoading || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden size={15} />
        </button>
      </div>
    </nav>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const visibleCount = Math.min(3, Math.max(totalPages, 1));
  const start = Math.min(Math.max(page - 1, 0), Math.max(totalPages - visibleCount, 0));

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}
