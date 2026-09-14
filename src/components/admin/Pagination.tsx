import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

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
        <IconButton
          aria-label="Página anterior"
          size="icon"
          disabled={isLoading || page <= 0}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden size={15} />
        </IconButton>

        {visiblePages.map((pageNumber) => (
          <Button
            aria-current={pageNumber === page ? 'page' : undefined}
            aria-label={`Ir para a página ${pageNumber + 1}`}
            variant={pageNumber === page ? 'default' : 'outline'}
            size="icon"
            disabled={isLoading}
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            type="button"
          >
            {pageNumber + 1}
          </Button>
        ))}

        <IconButton
          aria-label="Página seguinte"
          size="icon"
          disabled={isLoading || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden size={15} />
        </IconButton>
      </div>
    </nav>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const visibleCount = Math.min(3, Math.max(totalPages, 1));
  const start = Math.min(
    Math.max(page - 1, 0),
    Math.max(totalPages - visibleCount, 0),
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}
