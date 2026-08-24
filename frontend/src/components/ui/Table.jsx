export const Table = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
        {children}
      </table>
    </div>
  );
};

export const TableHead = ({ children, className = '' }) => {
  return <thead className={`bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}>{children}</thead>;
};

export const TableBody = ({ children, className = '' }) => {
  return <tbody className={`divide-y divide-slate-100 bg-white ${className}`}>{children}</tbody>;
};

export const TableRow = ({ children, className = '', isHoverable = true }) => {
  return (
    <tr className={`transition-colors ${isHoverable ? 'hover:bg-slate-50/80' : ''} ${className}`}>
      {children}
    </tr>
  );
};

export const TableHeaderCell = ({ children, className = '' }) => {
  return <th scope="col" className={`px-4 py-3.5 ${className}`}>{children}</th>;
};

export const TableCell = ({ children, className = '' }) => {
  return <td className={`px-4 py-3.5 whitespace-nowrap text-slate-700 ${className}`}>{children}</td>;
};

export default Table;
