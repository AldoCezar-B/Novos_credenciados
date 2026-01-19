// Configurações do Azure AD
const CONFIG = {
    clientId: localStorage.getItem('clientId') || '00000003-0000-0ff1-ce00-000000000000', // SharePoint Online Client ID padrão
    tenantId: localStorage.getItem('tenantId') || 'common',
    redirectUri: window.location.origin,
    authority: `https://login.microsoftonline.com/${localStorage.getItem('tenantId') || 'common'}`,
    scopes: [
        'https://cassi.sharepoint.com/.default',
        'openid',
        'profile',
        'offline_access'
    ],
    sharepointUrl: localStorage.getItem('sharepointUrl') || 'https://cassi.sharepoint.com/sites/GEO-DivisaodeMarketingeComunicacao'
};

// Instância do MSAL
let msalInstance = null;
let accessToken = null;

// Inicializa MSAL
async function initializeMSAL() {
    const msalConfig = {
        auth: {
            clientId: CONFIG.clientId,
            authority: CONFIG.authority,
            redirectUri: CONFIG.redirectUri,
            navigateToLoginRequestUrl: false
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false
        },
        system: {
            loggerOptions: {
                loggerCallback: (level, message, containsPii) => {
                    if (!containsPii) {
                        console.log(`[MSAL] ${message}`);
                    }
                },
                logLevel: msal.LogLevel.Verbose
            }
        }
    };
    
    msalInstance = new msal.PublicClientApplication(msalConfig);
    
    // Verifica se há resposta de autenticação na URL
    await msalInstance.handleRedirectPromise();
}

// Login com Microsoft (popup)
async function loginWithMicrosoft() {
    try {
        showLoading(true);
        showStatus('Redirecionando para login da Microsoft...', 'info');
        
        if (!msalInstance) {
            await initializeMSAL();
        }
        
        const loginRequest = {
            scopes: CONFIG.scopes,
            prompt: 'select_account'
        };
    
        const response = await msalInstance.loginPopup(loginRequest);
        
        if (response && response.account) {
            // Salva informações da conta
            localStorage.setItem('msal_account', JSON.stringify(response.account));
            
            // Obtém token de acesso para SharePoint
            await getAccessToken();
            
            showStatus('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                loadDashboard();
            }, 1500);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showStatus(`Erro: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Login com credenciais (método alternativo)
async function loginWithCredentials(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showStatus('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    try {
        showLoading(true);
        showStatus('Autenticando...', 'info');
        
        // Método usando Resource Owner Password Credentials (ROPC)
        const token = await getTokenWithROPC(username, password);
        
        if (token) {
            accessToken = token;
            localStorage.setItem('sharepoint_token', token);
            localStorage.setItem('username', username);
            
            showStatus('Autenticação realizada!', 'success');
            setTimeout(() => {
                loadDashboard();
            }, 1500);
        }
    } catch (error) {
        console.error('Erro:', error);
        showStatus('Credenciais inválidas ou erro de autenticação', 'error');
    } finally {
        showLoading(false);
    }
}

// ROPC Flow (para autenticação com usuário/senha)
async function getTokenWithROPC(username, password) {
    const tokenEndpoint = `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
        client_id: CONFIG.clientId,
        scope: 'https://cassi.sharepoint.com/.default',
        username: username,
        password: password,
        grant_type: 'password'
    });
    
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Falha na autenticação: ${error}`);
    }
    
    const data = await response.json();
    return data.access_token;
}

// Obtém access token
async function getAccessToken() {
    try {
        if (!msalInstance) {
            await initializeMSAL();
        }
        
        const accounts = msalInstance.getAllAccounts();
        
        if (accounts.length === 0) {
            throw new Error('Nenhuma conta autenticada');
        }
        
        const request = {
            scopes: CONFIG.scopes,
            account: accounts[0]
        };
        
        const response = await msalInstance.acquireTokenSilent(request)
            .catch(async (error) => {
                if (error.name === "InteractionRequiredAuthError") {
                    return msalInstance.acquireTokenPopup(request);
                }
                throw error;
            });
        
        accessToken = response.accessToken;
        localStorage.setItem('sharepoint_token', accessToken);
        
        return accessToken;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}

// Verifica se usuário já está autenticado
async function checkAuthentication() {
    try {
        // Verifica token no localStorage
        const savedToken = localStorage.getItem('sharepoint_token');
        
        if (savedToken) {
            // Verifica se o token ainda é válido
            const isValid = await validateToken(savedToken);
            
            if (isValid) {
                accessToken = savedToken;
                return true;
            } else {
                // Token expirado, tenta renovar
                if (msalInstance) {
                    const newToken = await getAccessToken();
                    if (newToken) return true;
                }
            }
        }
        
        // Verifica MSAL
        if (!msalInstance) {
            await initializeMSAL();
        }
        
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            const token = await getAccessToken();
            return !!token;
        }
        
        return false;
    } catch (error) {
        console.error('Erro na verificação:', error);
        return false;
    }
}

// Valida token
async function validateToken(token) {
    try {
        // Tenta uma chamada simples para verificar
        const testUrl = `${CONFIG.sharepointUrl}/_api/web?$select=Title`;
        
        const response = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Carrega o dashboard após login
function loadDashboard() {
    // Esconde tela de login
    document.querySelector('.login-container').style.display = 'none';
    
    // Mostra dashboard
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = 'block';
    
    // Carrega o CRUD
    loadCRUDInterface();
}

// Carrega interface do CRUD
function loadCRUDInterface() {
    const dashboard = document.getElementById('dashboard');
    
    dashboard.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h1>📊 Editor CSV - SharePoint</h1>
                <div>
                    <span id="userInfo" style="margin-right: 15px;"></span>
                    <button onclick="logout()" style="padding: 8px 16px; background: #d13438; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Sair
                    </button>
                </div>
            </div>
            
            <div id="status" style="padding: 10px; margin: 10px 0; border-radius: 4px; display: none;"></div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button onclick="loadCSVFromSharePoint()" style="padding: 10px 20px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Carregar CSV do SharePoint
                </button>
                <button onclick="showAddModal()" style="padding: 10px 20px; background: #107c10; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ➕ Adicionar Novo
                </button>
                <button onclick="saveToSharePoint()" style="padding: 10px 20px; background: #ff8c00; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    💾 Salvar no SharePoint
                </button>
            </div>
            
            <div id="loading" style="display: none; text-align: center; padding: 20px;">
                Carregando...
            </div>
            
            <div id="tableContainer"></div>
            
            <!-- Modal para edição -->
            <div id="editModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
                <div style="background: white; margin: 50px auto; padding: 20px; border-radius: 8px; width: 500px;">
                    <h2 id="modalTitle">Editar Registro</h2>
                    <form id="dataForm" onsubmit="saveData(event)">
                        <div id="formFields"></div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" onclick="closeModal()">Cancelar</button>
                            <button type="submit">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Carrega informações do usuário
    loadUserInfo();
    
    // Tenta carregar dados automaticamente
    setTimeout(() => {
        loadCSVFromSharePoint();
    }, 500);
}

// Carrega informações do usuário
async function loadUserInfo() {
    try {
        const token = accessToken || localStorage.getItem('sharepoint_token');
        
        if (!token) return;
        
        // Busca informações do usuário via Graph API
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            document.getElementById('userInfo').textContent = 
                `👤 ${userData.displayName || userData.userPrincipalName}`;
        }
    } catch (error) {
        console.error('Erro ao carregar info do usuário:', error);
    }
}

// Função para carregar CSV do SharePoint
async function loadCSVFromSharePoint() {
    showLoading(true);
    showStatus('', '');
    
    try {
        const token = accessToken || localStorage.getItem('sharepoint_token');
        
        if (!token) {
            throw new Error('Token de acesso não encontrado. Faça login novamente.');
        }
        
        // URL do arquivo CSV no SharePoint
        const filePath = `/sites/GEO-DivisaodeMarketingeComunicacao/Documentos Compartilhados/Inova cassi ampliou/localize-data.csv`;
        const fileUrl = `${CONFIG.sharepointUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(filePath)}')/$value`;
        
        console.log('Tentando acessar:', fileUrl);
        
        const response = await fetch(fileUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/csv'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        // Processa o CSV
        parseCSV(csvText);
        renderTable();
        
        showStatus('Dados carregados com sucesso do SharePoint!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar CSV:', error);
        showStatus(`Erro: ${error.message}`, 'error');
        
        // Tenta método alternativo
        await tryAlternativeMethod();
    } finally {
        showLoading(false);
    }
}

// Método alternativo para acessar o arquivo
async function tryAlternativeMethod() {
    try {
        const token = accessToken || localStorage.getItem('sharepoint_token');
        
        // Usa Graph API como alternativa
        const sitePath = 'cassi.sharepoint.com:/sites/GEO-DivisaodeMarketingeComunicacao:';
        const filePath = 'Documentos Compartilhados/Inova cassi ampliou/localize-data.csv';
        
        const graphUrl = `https://graph.microsoft.com/v1.0/sites/${sitePath}/drive/root:/${filePath}:/content`;
        
        const response = await fetch(graphUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const csvText = await response.text();
            parseCSV(csvText);
            renderTable();
            showStatus('Dados carregados via Graph API!', 'success');
        }
    } catch (error) {
        console.error('Método alternativo também falhou:', error);
    }
}

// Função para salvar no SharePoint
async function saveToSharePoint() {
    showLoading(true);
    
    try {
        const token = accessToken || localStorage.getItem('sharepoint_token');
        const csvContent = convertDataToCSV();
        
        // Prepara o conteúdo para upload
        const filePath = `/sites/GEO-DivisaodeMarketingeComunicacao/Documentos Compartilhados/Inova cassi ampliou/localize-data.csv`;
        const uploadUrl = `${CONFIG.sharepointUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(filePath)}')/$value`;
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-HTTP-Method': 'PUT',
                'Content-Type': 'text/csv'
            },
            body: csvContent
        });
        
        if (response.ok) {
            showStatus('Arquivo salvo com sucesso no SharePoint!', 'success');
        } else {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showStatus(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Funções auxiliares para o CSV
let csvData = [];
let csvHeaders = [];

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    
    if (lines.length === 0) {
        csvHeaders = [];
        csvData = [];
        return;
    }
    
    // Detecta delimitador
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    // Processa headers
    csvHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Processa dados
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        
        csvHeaders.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        csvData.push(row);
    }
}

function renderTable() {
    const container = document.getElementById('tableContainer');
    
    if (csvData.length === 0) {
        container.innerHTML = '<p>Nenhum dado encontrado.</p>';
        return;
    }
    
    let html = '<table border="1" style="width: 100%; border-collapse: collapse;">';
    
    // Cabeçalho
    html += '<thead><tr>';
    csvHeaders.forEach(header => {
        html += `<th style="padding: 10px; background: #f0f0f0;">${header}</th>`;
    });
    html += '<th>Ações</th></tr></thead>';
    
    // Dados
    html += '<tbody>';
    csvData.forEach((row, index) => {
        html += '<tr>';
        csvHeaders.forEach(header => {
            html += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${row[header] || ''}</td>`;
        });
        html += `<td>
            <button onclick="editRow(${index})" style="margin-right: 5px;">Editar</button>
            <button onclick="deleteRow(${index})" style="background: #d13438; color: white;">Excluir</button>
        </td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    container.innerHTML = html;
}

function convertDataToCSV() {
    if (csvData.length === 0) return '';
    
    let csvContent = csvHeaders.join(',') + '\n';
    
    csvData.forEach(row => {
        const rowValues = csvHeaders.map(header => {
            const value = row[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        
        csvContent += rowValues.join(',') + '\n';
    });
    
    return csvContent;
}

// Logout
async function logout() {
    try {
        if (msalInstance) {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                await msalInstance.logoutPopup();
            }
        }
        
        // Limpa localStorage
        localStorage.removeItem('sharepoint_token');
        localStorage.removeItem('msal_account');
        localStorage.removeItem('username');
        
        // Recarrega a página
        window.location.reload();
    } catch (error) {
        console.error('Erro no logout:', error);
        window.location.reload();
    }
}

// Utilitários
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'block' : 'none';
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = message ? 'block' : 'none';
        statusEl.style.background = type === 'success' ? '#dff6dd' : 
                                  type === 'error' ? '#fed9cc' : '#c7e0f4';
        statusEl.style.color = type === 'success' ? '#107c10' : 
                              type === 'error' ? '#d83b01' : '#005a9e';
    }
}

// Configurações
function saveConfig() {
    const clientId = document.getElementById('clientId').value;
    const tenantId = document.getElementById('tenantId').value;
    const sharepointUrl = document.getElementById('sharepointUrl').value;
    
    if (clientId) localStorage.setItem('clientId', clientId);
    if (tenantId) localStorage.setItem('tenantId', tenantId);
    if (sharepointUrl) localStorage.setItem('sharepointUrl', sharepointUrl);
    
    showStatus('Configurações salvas! Reinicie a página.', 'success');
}

// Verifica autenticação ao carregar a página
async function init() {
    // Carrega configurações salvas
    document.getElementById('clientId').value = localStorage.getItem('clientId') || '';
    document.getElementById('tenantId').value = localStorage.getItem('tenantId') || '';
    document.getElementById('sharepointUrl').value = localStorage.getItem('sharepointUrl') || CONFIG.sharepointUrl;
    
    // Verifica se já está autenticado
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
        showStatus('Sessão recuperada. Carregando dados...', 'info');
        setTimeout(() => {
            loadDashboard();
        }, 1000);
    }
}

// Inicializa quando a página carrega
document.addEventListener('DOMContentLoaded', init);