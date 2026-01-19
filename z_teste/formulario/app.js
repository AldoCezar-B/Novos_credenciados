// Configurações
const SHAREPOINT_SITE = 'https://cassi.sharepoint.com/sites/GEO-DivisaodeMarketingeComunicacao';
const CSV_FILE_PATH = '/sites/GEO-DivisaodeMarketingeComunicacao/Documentos Compartilhados/Inova cassi ampliou/localize-data.csv';
const AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/authorize';
const CLIENT_ID = '00000003-0000-0ff1-ce00-000000000000'; // SharePoint Online Client ID

// Variáveis globais
let currentData = [];
let currentHeaders = [];
let itemToDelete = null;
let editIndex = null;

// Função para carregar o CSV
async function loadCSV() {
    showLoading(true);
    showStatus('', '');
    
    try {
        // Verifica se o usuário está autenticado
        if (!await checkAuthentication()) {
            await authenticate();
            return;
        }
        
        // Obtém o token de acesso
        const token = await getAccessToken();
        
        // Lê o arquivo CSV
        const csvContent = await readCSVFile(token);
        
        // Parse do CSV
        parseCSV(csvContent);
        
        // Exibe os dados na tabela
        renderTable();
        
        showStatus('Dados carregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao carregar CSV:', error);
        showStatus(`Erro ao carregar dados: ${error.message}`, 'error');
        
        // Fallback: tenta carregar via fetch se disponível
        try {
            await loadCSVFallback();
        } catch (fallbackError) {
            console.error('Fallback também falhou:', fallbackError);
        }
    } finally {
        showLoading(false);
    }
}

// Fallback para carregar CSV (método alternativo)
async function loadCSVFallback() {
    try {
        // Tenta acessar o arquivo diretamente (pode requerer autenticação interativa)
        const response = await fetch('https://cassi.sharepoint.com/:x:/r/sites/GEO-DivisaodeMarketingeComunicacao/Documentos%20Compartilhados/Inova%20cassi%20ampliou/localize-data.csv?d=w688874858eaa4e6baccf9d2c2e382ed5&csf=1&web=1&e=MfoFdy');
        
        if (response.ok) {
            const csvText = await response.text();
            parseCSV(csvText);
            renderTable();
        } else {
            throw new Error('Não foi possível acessar o arquivo');
        }
    } catch (error) {
        throw error;
    }
}

// Parse do conteúdo CSV
function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    
    if (lines.length === 0) {
        currentHeaders = [];
        currentData = [];
        return;
    }
    
    // Detecta o separador (vírgula ou ponto-e-vírgula)
    const firstLine = lines[0];
    const hasSemicolon = firstLine.split(';').length > firstLine.split(',').length;
    const delimiter = hasSemicolon ? ';' : ',';
    
    // Processa headers
    currentHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Processa dados
    currentData = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = parseCSVLine(lines[i], delimiter);
        const row = {};
        
        currentHeaders.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        currentData.push(row);
    }
}

// Parse de uma linha CSV considerando aspas
function parseCSVLine(line, delimiter) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentValue += '"';
                i++; // Pula próximo caractere
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue.trim());
    return values;
}

// Renderiza a tabela
function renderTable() {
    const container = document.getElementById('tableContainer');
    
    if (currentData.length === 0) {
        container.innerHTML = '<p>Nenhum dado encontrado. Clique em "Adicionar Novo" para começar.</p>';
        return;
    }
    
    let html = '<table>';
    
    // Cabeçalho
    html += '<thead><tr>';
    currentHeaders.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '<th>Ações</th></tr></thead>';
    
    // Corpo
    html += '<tbody>';
    currentData.forEach((row, index) => {
        html += '<tr>';
        currentHeaders.forEach(header => {
            html += `<td>${row[header] || ''}</td>`;
        });
        html += `<td>
            <button onclick="editRow(${index})" style="margin-right: 5px;">✏️ Editar</button>
            <button onclick="deleteRow(${index})" class="delete">🗑️ Excluir</button>
        </td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    container.innerHTML = html;
}

// Modal para adicionar/editar
function showAddModal() {
    editIndex = null;
    document.getElementById('modalTitle').textContent = 'Adicionar Novo Registro';
    
    const formFields = document.getElementById('formFields');
    formFields.innerHTML = '';
    
    currentHeaders.forEach(header => {
        formFields.innerHTML += `
            <div class="form-group">
                <label for="${header}">${header}</label>
                <input type="text" id="field_${header}" name="${header}">
            </div>
        `;
    });
    
    document.getElementById('editModal').style.display = 'block';
}

function editRow(index) {
    editIndex = index;
    document.getElementById('modalTitle').textContent = 'Editar Registro';
    
    const formFields = document.getElementById('formFields');
    formFields.innerHTML = '';
    
    currentHeaders.forEach(header => {
        formFields.innerHTML += `
            <div class="form-group">
                <label for="${header}">${header}</label>
                <input type="text" id="field_${header}" name="${header}" value="${currentData[index][header] || ''}">
            </div>
        `;
    });
    
    document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('dataForm').reset();
}

// Salva os dados
function saveData(event) {
    event.preventDefault();
    
    const newRow = {};
    currentHeaders.forEach(header => {
        const input = document.getElementById(`field_${header}`);
        newRow[header] = input.value;
    });
    
    if (editIndex !== null) {
        // Editar linha existente
        currentData[editIndex] = newRow;
        showStatus('Registro atualizado com sucesso!', 'success');
    } else {
        // Adicionar nova linha
        currentData.push(newRow);
        showStatus('Registro adicionado com sucesso!', 'success');
    }
    
    renderTable();
    closeModal();
    
    // Atualiza o arquivo CSV no SharePoint
    updateCSVFile();
}

// Excluir linha
function deleteRow(index) {
    itemToDelete = index;
    document.getElementById('confirmModal').style.display = 'block';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    itemToDelete = null;
}

function confirmDelete() {
    if (itemToDelete !== null) {
        currentData.splice(itemToDelete, 1);
        renderTable();
        showStatus('Registro excluído com sucesso!', 'success');
        closeConfirmModal();
        
        // Atualiza o arquivo CSV no SharePoint
        updateCSVFile();
    }
}

// Busca na tabela
function searchTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const table = document.querySelector('table');
    
    if (!table) return;
    
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let j = 0; j < cells.length - 1; j++) {
            const cellText = cells[j].textContent.toLowerCase();
            if (cellText.includes(searchTerm)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// Exporta para CSV
function exportToCSV() {
    if (currentData.length === 0) {
        showStatus('Nenhum dado para exportar', 'error');
        return;
    }
    
    let csvContent = currentHeaders.join(',') + '\n';
    
    currentData.forEach(row => {
        const rowValues = currentHeaders.map(header => {
            const value = row[header] || '';
            // Escapa aspas e vírgulas
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        
        csvContent += rowValues.join(',') + '\n';
    });
    
    // Cria um blob e faz download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'localize-data-export.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('CSV exportado com sucesso!', 'success');
}

// Funções de utilitário
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('refreshBtn').disabled = show;
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (type ? type : '');
    
    if (message && type) {
        setTimeout(() => {
            statusDiv.className = 'status';
            statusDiv.textContent = '';
        }, 5000);
    }
}

// Funções de autenticação e acesso ao SharePoint (simplificadas)
async function checkAuthentication() {
    // Verifica se há token salvo
    const token = localStorage.getItem('sharepoint_token');
    const expiry = localStorage.getItem('sharepoint_token_expiry');
    
    if (token && expiry && new Date().getTime() < parseInt(expiry)) {
        return true;
    }
    
    return false;
}

async function authenticate() {
    // Redireciona para autenticação do SharePoint
    const redirectUri = encodeURIComponent(window.location.origin);
    const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}&resource=${encodeURIComponent('https://cassi.sharepoint.com')}`;
    
    showStatus('Redirecionando para autenticação...', '');
    
    // Em ambiente real, isso seria mais complexo
    // Para simplificar, vamos usar um prompt para token manual
    const token = prompt('Para acessar o SharePoint, cole seu token de acesso (obtenha do Azure AD ou use método alternativo):');
    
    if (token) {
        localStorage.setItem('sharepoint_token', token);
        localStorage.setItem('sharepoint_token_expiry', (new Date().getTime() + 3600000).toString());
        return true;
    }
    
    return false;
}

async function getAccessToken() {
    return localStorage.getItem('sharepoint_token');
}

async function readCSVFile(token) {
    // Implementação básica - em produção, use a API REST do SharePoint
    throw new Error('Implementação de acesso ao SharePoint requer configuração adicional');
}

async function updateCSVFile() {
    // Implementação para atualizar o arquivo no SharePoint
    showStatus('Atualizando arquivo no SharePoint...', '');
    
    // Em produção, implemente a chamada à API do SharePoint
    setTimeout(() => {
        showStatus('Dados salvos localmente. Nota: Upload para SharePoint requer implementação adicional.', 'success');
    }, 1000);
}

// Versão alternativa sem autenticação complexa
async function loadCSVSimple() {
    showLoading(true);
    
    try {
        // Tenta usar o link direto (pode não funcionar sem autenticação)
        const response = await fetch(`https://cassi.sharepoint.com/sites/GEO-DivisaodeMarketingeComunicacao/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(CSV_FILE_PATH)}')/$value`, {
            headers: {
                'Accept': 'text/csv'
            }
        });
        
        if (response.ok) {
            const csvText = await response.text();
            parseCSV(csvText);
            renderTable();
            showStatus('Dados carregados com sucesso!', 'success');
        } else {
            throw new Error('Falha ao carregar arquivo');
        }
    } catch (error) {
        // Fallback: permite edição local sem SharePoint
        showStatus('Usando modo local. Para salvar no SharePoint, configure a autenticação.', 'error');
        
        // Carrega dados de exemplo ou localStorage
        const savedData = localStorage.getItem('csv_data');
        if (savedData) {
            parseCSV(savedData);
            renderTable();
        } else {
            currentHeaders = ['Nome', 'Email', 'Telefone', 'Departamento'];
            currentData = [
                { 'Nome': 'Exemplo', 'Email': 'exemplo@cassi.com.br', 'Telefone': '(61) 99999-9999', 'Departamento': 'TI' }
            ];
            renderTable();
        }
    } finally {
        showLoading(false);
    }
}

// Função para salvar localmente (fallback)
function saveLocal() {
    const csvContent = convertToCSV();
    localStorage.setItem('csv_data', csvContent);
    showStatus('Dados salvos localmente!', 'success');
}

function convertToCSV() {
    if (currentData.length === 0) return '';
    
    let csvContent = currentHeaders.join(',') + '\n';
    
    currentData.forEach(row => {
        const rowValues = currentHeaders.map(header => {
            const value = row[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        
        csvContent += rowValues.join(',') + '\n';
    });
    
    return csvContent;
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Tenta carregar os dados ao iniciar
    loadCSVSimple();
    
    // Adiciona listener para salvar localmente quando a página for fechada
    window.addEventListener('beforeunload', function() {
        if (currentData.length > 0) {
            saveLocal();
        }
    });
});