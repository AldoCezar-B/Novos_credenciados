class CSVManager {
    constructor() {
        this.data = [];
        this.headers = ['A', 'B', 'C'];
        this.filteredData = null;
        this.currentSearch = '';
        this.selectedColumn = null;
        this.initializeEventListeners();
        this.updateStatus('Pronto para começar');
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Auto-save quando o usuário para de digitar
        document.addEventListener('blur', (e) => {
            if (e.target.contentEditable === 'true') {
                this.autoSave();
            }
        }, true);
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.updateStatus('Carregando arquivo...', '');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvContent = e.target.result;
                this.parseCSV(csvContent);
                this.updateStatus(`Arquivo "${file.name}" carregado com sucesso!`, 'success');
            } catch (error) {
                this.updateStatus('Erro ao processar arquivo: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.updateStatus('Erro ao ler arquivo', 'error');
        };
        
        reader.readAsText(file, 'UTF-8');
    }

    parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            this.data = [];
            this.headers = ['A', 'B', 'C'];
            this.renderTable();
            return;
        }

        // Processamento mais robusto do CSV
        const parsedLines = lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Pular próxima aspas
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current.trim());
            return result.map(cell => cell.replace(/^"|"$/g, '')); // Remover aspas extras
        });

        // Detecta se há cabeçalho baseado no conteúdo
        const firstLine = parsedLines[0];
        const secondLine = parsedLines[1] || [];
        
        const hasHeader = firstLine.some((cell, index) => {
            const secondCell = secondLine[index];
            return cell && (!secondCell || isNaN(cell) || isNaN(secondCell));
        });

        if (hasHeader) {
            this.headers = firstLine.map(header => header || 'Coluna');
            this.data = parsedLines.slice(1).map(line => {
                return this.headers.map((_, index) => line[index] || '');
            });
        } else {
            this.headers = firstLine.map((_, index) => 
                String.fromCharCode(65 + (index % 26)) + (index >= 26 ? Math.floor(index / 26) : '')
            );
            this.data = parsedLines.map(line => 
                this.headers.map((_, index) => line[index] || '')
            );
        }

        this.filteredData = null;
        this.currentSearch = '';
        this.renderTable();
        this.updateSearchInfo();
    }

    renderTable() {
        const tableHeader = document.getElementById('tableHeader');
        const tableBody = document.getElementById('tableBody');
        const dataToRender = this.filteredData || this.data;

        // Renderizar cabeçalho
        tableHeader.innerHTML = '';
        const headerRow = document.createElement('tr');
        
        this.headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.contentEditable = true;
            th.className = this.selectedColumn === index ? 'column-selected' : '';
            
            th.addEventListener('blur', (e) => {
                this.headers[index] = e.target.textContent || `Coluna ${index + 1}`;
                this.autoSave();
            });

            th.addEventListener('click', () => {
                this.selectedColumn = index;
                this.renderTable();
            });

            // Controles de coluna
            const columnControls = document.createElement('div');
            columnControls.className = 'column-controls';
            columnControls.innerHTML = `
                <button onclick="event.stopPropagation(); csvManager.deleteColumn(${index})" 
                        class="btn btn-danger btn-sm column-btn" title="Remover coluna">×</button>
            `;
            th.appendChild(columnControls);
            
            headerRow.appendChild(th);
        });

        // Coluna de ações no cabeçalho
        const actionsTh = document.createElement('th');
        actionsTh.className = 'actions';
        actionsTh.textContent = 'Ações';
        headerRow.appendChild(actionsTh);
        tableHeader.appendChild(headerRow);

        // Renderizar corpo
        tableBody.innerHTML = '';
        
        if (dataToRender.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = this.headers.length + 1;
            emptyCell.textContent = 'Nenhum dado encontrado';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.color = '#7f8c8d';
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);
        } else {
            dataToRender.forEach((row, rowIndex) => {
                const originalRowIndex = this.data.indexOf(row);
                const tr = document.createElement('tr');
                
                row.forEach((cell, colIndex) => {
                    const td = document.createElement('td');
                    td.contentEditable = true;
                    td.textContent = cell;
                    
                    // Destacar resultados da busca
                    if (this.currentSearch && 
                        cell.toString().toLowerCase().includes(this.currentSearch.toLowerCase())) {
                        td.classList.add('highlight');
                        tr.classList.add('highlight-row');
                    }
                    
                    td.addEventListener('blur', (e) => {
                        this.data[originalRowIndex][colIndex] = e.target.textContent;
                        this.autoSave();
                    });
                    
                    tr.appendChild(td);
                });

                // Coluna de ações
                const actionsTd = document.createElement('td');
                actionsTd.className = 'actions';
                actionsTd.innerHTML = `
                    <button onclick="csvManager.deleteRow(${originalRowIndex})" 
                            class="btn btn-danger btn-sm">🗑️</button>
                `;
                tr.appendChild(actionsTd);
                tableBody.appendChild(tr);
            });
        }
    }

    // BARRA DE BUSCA
    performSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        this.currentSearch = searchTerm;
        
        if (!searchTerm) {
            this.filteredData = null;
            this.renderTable();
            this.updateSearchInfo();
            return;
        }

        this.filteredData = this.data.filter(row => 
            row.some(cell => 
                cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

        this.renderTable();
        this.updateSearchInfo();
        
        if (this.filteredData.length === 0) {
            this.updateStatus('Nenhum resultado encontrado para: ' + searchTerm, 'error');
        } else {
            this.updateStatus(`Encontrados ${this.filteredData.length} resultados para: ${searchTerm}`, 'success');
        }
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.currentSearch = '';
        this.filteredData = null;
        this.renderTable();
        this.updateSearchInfo();
        this.updateStatus('Busca limpa', 'success');
    }

    updateSearchInfo() {
        const searchResults = document.getElementById('searchResults');
        const total = this.data.length;
        const filtered = this.filteredData ? this.filteredData.length : total;
        
        if (this.currentSearch) {
            searchResults.textContent = `Encontrados: ${filtered} de ${total} resultados para "${this.currentSearch}"`;
            searchResults.className = 'success';
        } else {
            searchResults.textContent = `Total de linhas: ${total}`;
            searchResults.className = '';
        }
    }

    // MÉTODOS EXISTENTES (atualizados)
    addRow() {
        const newRow = Array(this.headers.length).fill('');
        this.data.push(newRow);
        this.filteredData = null;
        this.renderTable();
        this.updateSearchInfo();
        this.updateStatus('Nova linha adicionada', 'success');
        this.autoSave();
    }

    addColumn() {
        const newColumnName = `Coluna ${this.headers.length + 1}`;
        this.headers.push(newColumnName);
        
        this.data.forEach(row => row.push(''));
        this.filteredData = null;
        this.renderTable();
        this.updateSearchInfo();
        this.updateStatus('Nova coluna adicionada', 'success');
        this.autoSave();
    }

    deleteRow(rowIndex) {
        if (confirm('Tem certeza que deseja excluir esta linha?')) {
            this.data.splice(rowIndex, 1);
            this.filteredData = null;
            this.renderTable();
            this.updateSearchInfo();
            this.updateStatus('Linha excluída', 'success');
            this.autoSave();
        }
    }

    deleteColumn(colIndex) {
        if (this.headers.length <= 1) {
            alert('Não é possível remover a última coluna');
            return;
        }

        if (confirm('Tem certeza que deseja excluir esta coluna e todos os seus dados?')) {
            this.headers.splice(colIndex, 1);
            this.data.forEach(row => row.splice(colIndex, 1));
            this.filteredData = null;
            this.selectedColumn = null;
            this.renderTable();
            this.updateSearchInfo();
            this.updateStatus('Coluna excluída', 'success');
            this.autoSave();
        }
    }

    deleteSelectedColumn() {
        if (this.selectedColumn === null) {
            alert('Por favor, selecione uma coluna clicando no seu cabeçalho');
            return;
        }
        this.deleteColumn(this.selectedColumn);
    }

    clearData() {
        if (confirm('Isso irá limpar TODOS os dados. Tem certeza?')) {
            this.data = [];
            this.headers = ['A', 'B', 'C'];
            this.filteredData = null;
            this.currentSearch = '';
            this.selectedColumn = null;
            this.renderTable();
            this.updateSearchInfo();
            this.updateStatus('Todos os dados foram limpos', 'success');
            localStorage.removeItem('csvAutoSave');
        }
    }

    exportCSV() {
        if (this.data.length === 0) {
            this.updateStatus('Nenhum dado para exportar', 'error');
            return;
        }

        const dataToExport = this.filteredData || this.data;
        
        let csvContent = this.headers.join(',') + '\n';
        csvContent += dataToExport.map(row => 
            row.map(cell => {
                // Escapar células que contêm vírgulas, quebras de linha ou aspas
                if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `dados_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.updateStatus(`Arquivo CSV exportado com ${dataToExport.length} linhas`, 'success');
    }

    newFile() {
        if (this.data.length > 0 && !confirm('Isso irá limpar todos os dados atuais. Continuar?')) {
            return;
        }
        this.data = [Array(this.headers.length).fill('')];
        this.filteredData = null;
        this.currentSearch = '';
        this.selectedColumn = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('searchInput').value = '';
        this.renderTable();
        this.updateSearchInfo();
        this.updateStatus('Novo arquivo criado', 'success');
    }

    autoSave() {
        const saveData = {
            headers: this.headers,
            data: this.data,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('csvAutoSave', JSON.stringify(saveData));
    }

    loadAutoSave() {
        const saved = localStorage.getItem('csvAutoSave');
        if (saved) {
            try {
                const saveData = JSON.parse(saved);
                this.headers = saveData.headers;
                this.data = saveData.data;
                this.renderTable();
                this.updateSearchInfo();
                this.updateStatus('Dados recuperados do auto-save');
            } catch (error) {
                console.error('Erro ao carregar auto-save:', error);
            }
        }
    }

    updateStatus(message, type = '') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = type;
    }
}

// Funções globais atualizadas
function performSearch() {
    csvManager.performSearch();
}

function clearSearch() {
    csvManager.clearSearch();
}

function deleteSelectedColumn() {
    csvManager.deleteSelectedColumn();
}

function clearData() {
    csvManager.clearData();
}

// Mantenha as outras funções globais como estavam...

// Inicializar quando a página carregar
let csvManager;
document.addEventListener('DOMContentLoaded', () => {
    csvManager = new CSVManager();
    csvManager.loadAutoSave();
});

window.csvManager = csvManager;