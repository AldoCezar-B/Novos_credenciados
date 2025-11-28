
<?php
// editar-clinica.php
$senha = "12345"; // senha simples para proteção
$csvFile = __DIR__ . '/dados_clinica.csv';

// Autenticação simples
if (!isset($_POST['auth']) || $_POST['auth'] !== $senha) {
    echo '<form method="POST">
            <label>Senha:</label>
            <input type="password" name="auth">
            <button type="submit">Entrar</button>
          </form>';
    exit;
}

// Se houver atualização
if (isset($_POST['titulo'])) {
    $dados = [
        $_POST['titulo'],
        $_POST['endereco'],
        $_POST['uf'],
        $_POST['telefone'],
        $_POST['contato'],
        $_POST['cnpj'],
        $_POST['horario'],
        $_POST['servicos'],
        $_POST['procedimentos'],
        $_POST['gerente_uni'],
        $_POST['gerente_clin']
    ];
    $fp = fopen($csvFile, 'w');
    fputcsv($fp, ['titulo','endereco','uf','telefone','contato','cnpj','horario_atend','servicos_of','procedimentos','gerente_uni','gerente_clin']);
    fputcsv($fp, $dados);
    fclose($fp);
    echo "<p>Dados atualizados com sucesso!</p>";
}

// Ler dados atuais
$linhas = array_map('str_getcsv', file($csvFile));
$dados = $linhas[1]; // segunda linha (dados)
?>

<form method="POST">
    <input type="hidden" name="auth" value="<?php echo $senha; ?>">
    <label>Título:</label><input type="text" name="titulo" value="<?php echo $dados[0]; ?>"><br>
    <label>Endereço:</label><input type="text" name="endereco" value="<?php echo $dados[1]; ?>"><br>
    <label>UF:</label><input type="text" name="uf" value="<?php echo $dados[2]; ?>"><br>
    <label>Telefone:</label><input type="text" name="telefone" value="<?php echo $dados[3]; ?>"><br>
    <label>Contato:</label><input type="text" name="contato" value="<?php echo $dados[4]; ?>"><br>
    <label>CNPJ:</label><input type="text" name="cnpj" value="<?php echo $dados[5]; ?>"><br>
    <label>Horário:</label><textarea name="horario"><?php echo $dados[6]; ?></textarea><br>
    <label>Serviços:</label><textarea name="servicos"><?php echo $dados[7]; ?></textarea><br>
    <label>Procedimentos:</label><textarea name="procedimentos"><?php echo $dados[8]; ?></textarea><br>
    <label>Gerente Unidade:</label><input type="text" name="gerente_uni" value="<?php echo $dados[9]; ?>"><br>
    <label>Gerente Clínica:</label><input type="text" name="gerente_clin" value="<?php echo $dados[10]; ?>"><br>
    <button type="submit">Salvar</button>
</form>
