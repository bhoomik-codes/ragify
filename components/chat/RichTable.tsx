'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RichTable.module.css';

interface RichTableProps {
  headers: string[];
  rows: any[][];
}

export function RichTable({ headers, rows }: RichTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: number, direction: 'asc' | 'desc' | null }>({ key: -1, direction: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting logic
  const sortedRows = useMemo(() => {
    if (sortConfig.key === -1 || !sortConfig.direction) return rows;

    return [...rows].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  // Filtering logic
  const filteredRows = useMemo(() => {
    if (!searchTerm) return sortedRows;
    const lowerSearch = searchTerm.toLowerCase();
    return sortedRows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(lowerSearch))
    );
  }, [sortedRows, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const handleSort = (index: number) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === index && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === index && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key: index, direction });
  };

  const exportCSV = () => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'table_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableToolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search table..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={exportCSV} className={styles.exportBtn}>
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th key={i} onClick={() => handleSort(i)} className={sortConfig.key === i ? styles.activeHeader : ''}>
                  <div className={styles.headerContent}>
                    {header}
                    <ArrowUpDown size={12} className={styles.sortIcon} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {paginatedRows.map((row, rowIndex) => (
                <motion.tr 
                  key={rowIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: rowIndex * 0.03 }}
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell === null || cell === undefined ? '—' : String(cell)}</td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className={styles.emptyRow}>No results found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.tableFooter}>
        <div className={styles.pageInfo}>
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} entries
        </div>
        <div className={styles.pagination}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span>Page {currentPage} of {totalPages || 1}</span>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
