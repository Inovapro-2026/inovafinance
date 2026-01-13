# Guia: Transformar INOVABANK em APK

Para transformar um PWA em APK de forma profissional e gratuita, o método mais recomendado é utilizar o **PWABuilder** (mantido pela Microsoft).

## Passo a Passo

1. **Acesse o site**: [pwabuilder.com](https://www.pwabuilder.com/)
2. **Insira a URL do seu App**: `https://inovabank.inovapro.cloud`
3. **Clique em "Start"**: O site irá analisar seu manifest, ícones e service worker.
4. **Resumo da Análise**: 
   - Se tudo estiver verde (como configuramos), clique em **"Next"**.
5. **Gerar APK/AAB**:
   - Clique no botão **"Package for Store"** na seção Android.
   - Escolha **"Download Package"**.
6. **Resultado**: Você receberá um arquivo `.zip` contendo o APK para testes e o arquivo `.aab` para enviar à Google Play Store.

## Por que usar o PWABuilder?
- **TWA (Trusted Web Activity)**: Ele não é apenas um "wrapper" simples; ele usa a tecnologia oficial do Google que garante melhor performance e acesso total a recursos do navegador.
- **Assinatura Digital**: Ele gera certificados de assinatura automaticamente se você não tiver um.
- **Compatibilidade**: Já configuramos os ícones e o manifest para serem 100% compatíveis.

> [!NOTE]
> Como sou um assistente de IA em um ambiente restrito, não consigo compilar o arquivo binário (.apk) diretamente aqui, pois isso exigiria a instalação de gigabytes de ferramentas (Android SDK, Java, Gradle). Mas com a URL do seu app, o PWABuilder faz isso em segundos!
