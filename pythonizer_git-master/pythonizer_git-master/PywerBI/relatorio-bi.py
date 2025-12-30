from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import time
import io
import pandas as pd


def _exec_async_js(driver, js_src, timeout=30):
    driver.set_script_timeout(timeout)
    return driver.execute_async_script(js_src)


def list_visual_names(report_url: str, wait_seconds: int = 20) -> list:
    """Abre o report_url, aguarda e retorna uma lista de nomes de visuais disponíveis no relatório.
    Uso: execute, faça login manualmente no browser se necessário, e a função retorna os nomes de visuais.
    """
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    driver = webdriver.Chrome(service=service, options=options)
    driver.get(report_url)

    print("Abra o browser e faça login no Power BI se necessário. Aguardando carregamento...")
    time.sleep(wait_seconds)

    js = """
    const callback = arguments[arguments.length - 1];
    (async () => {
        try {
            if(!window.powerbi) return callback({error: 'powerbi não encontrado'});
            // tenta localizar o report embutido
            let report;
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.powerbi) {
                report = iframe.contentWindow.powerbi.get(iframe);
            } else {
                const el = document.querySelector('[data-report-id], .reportContainer, .report');
                report = window.powerbi.get ? window.powerbi.get(el) : null;
            }
            if(!report) return callback({error: 'report não localizado (powerbi.get retornou null)'});
            const page = await report.getActivePage();
            // tenta obter visual names
            let visualNames = [];
            try {
                // alguns SDKs expõem getVisuals
                if(page.getVisuals) {
                    const visuals = await page.getVisuals();
                    visualNames = visuals.map(v=>v.name || v.getName && v.getName());
                } else if(page.getVisualByName) {
                    // não há lista; tentaremos descobrir por tentativa — falhamos para não travar
                    visualNames = ['(use export_visual_to_xlsx com o nome conhecido)'];
                } else {
                    visualNames = ['(nenhum método para listar visuais disponível no embed)'];
                }
            } catch(e) {
                visualNames = ['(erro ao listar visuais: ' + e + ')'];
            }
            callback({visualNames});
        } catch(err) {
            callback({error: err.toString()});
        }
    })();
    """

    result = _exec_async_js(driver, js, timeout=60)
    driver.quit()
    if isinstance(result, dict) and result.get('error'):
        raise RuntimeError('Erro ao listar visuais: ' + result['error'])
    return result.get('visualNames', [])


def export_visual_to_xlsx(report_url: str, visual_name: str | None, out_xlsx_path: str, wait_seconds: int = 25) -> None:
    """Exporta os dados do visual especificado para um arquivo XLSX.
    Se visual_name for None, a função tentará exportar do primeiro visual encontrado.
    """
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    driver = webdriver.Chrome(service=service, options=options)
    driver.get(report_url)

    print("Abra o browser e faça login no Power BI se necessário. Aguardando carregamento...")
    time.sleep(wait_seconds)

    # JS: encontra o report embutido, a página ativa e o visual; chama exportData e retorna o CSV (texto)
    js_template = """
    const visualNameOrNull = %s;
    const callback = arguments[arguments.length - 1];
    (async () => {
        try {
            const waitFor = (fn, timeout=15000) => new Promise((res, rej) => {
                const t0 = Date.now();
                (function loop() {
                    if (fn()) return res();
                    if (Date.now() - t0 > timeout) return rej('timeout');
                    setTimeout(loop, 200);
                })();
            });
            await waitFor(()=>window.powerbi && (document.querySelector('iframe') || document.querySelector('[data-report-id], .reportContainer, .report')) , 20000);

            let report;
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.powerbi) {
                report = iframe.contentWindow.powerbi.get(iframe);
            } else {
                const el = document.querySelector('[data-report-id], .reportContainer, .report');
                report = window.powerbi.get ? window.powerbi.get(el) : null;
            }
            if (!report) return callback('ERROR: não localizei o report embutido (powerbi.get)');

            const models = window['powerbi-client'] ? window['powerbi-client'].models : (window.powerbi && window.powerbi.models);
            const page = await report.getActivePage();

            let visual = null;
            if (visualNameOrNull) {
                try {
                    if (page.getVisualByName) {
                        visual = await page.getVisualByName(visualNameOrNull);
                    }
                } catch(e) {
                    // ignora
                }
            }

            if (!visual) {
                // tenta pegar a primeira visual disponível
                if (page.getVisuals) {
                    const visuals = await page.getVisuals();
                    if (visuals && visuals.length) visual = visuals[0];
                }
            }

            if (!visual) return callback('ERROR: visual não encontrado: ' + visualNameOrNull);

            // 0 = Summarized (Dados como layout atual), 1 = Underlying
            const blob = await visual.exportData(models.ExportDataType.Summarized);
            const reader = new FileReader();
            reader.onload = function() { callback(reader.result); };
            reader.onerror = function(e) { callback('ERROR: ' + e); };
            reader.readAsText(blob);
        } catch(err) {
            callback('ERROR: ' + err.toString());
        }
    })();
    """

    js = js_template % ('null' if visual_name is None else ('"' + visual_name.replace('"','\\"') + '"'))
    result = _exec_async_js(driver, js, timeout=90)
    if isinstance(result, str) and result.startswith('ERROR:'):
        driver.quit()
        raise RuntimeError(result)

    csv_text = result
    # Converte CSV para DataFrame e salva em xlsx
    df = pd.read_csv(io.StringIO(csv_text))
    df.to_excel(out_xlsx_path, index=False)
    driver.quit()
    print('Exportado para:', out_xlsx_path)


if __name__ == '__main__':
    import os
    from datetime import datetime

    # URL e paths fornecidos pelo usuário
    report_url = 'https://app.powerbi.com/groups/6eade2a6-0a4c-4bb5-af49-784cf9c62a40/reports/d7f54ee9-e35b-4671-b74d-1e40ec74cbbc/a3eafd5c2340845bbd42?experience=power-bi'
    visual_name = None
    out_folder = r'C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\_origem'

    # cria pasta de saída se não existir
    os.makedirs(out_folder, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_xlsx = os.path.join(out_folder, f'exportado_powerbi_{timestamp}.xlsx')

    try:
        print('Iniciando exportação do relatório para:', out_xlsx)
        export_visual_to_xlsx(report_url, visual_name, out_xlsx)
        print('Concluído com sucesso.')
    except Exception as e:
        print('Erro durante exportação:', e)