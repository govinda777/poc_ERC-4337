class BiometricService {
  constructor() {
    this.isAvailable = null;
  }
  
  async checkDeviceCompatibility() {
    if (this.isAvailable !== null) return this.isAvailable;
    
    try {
      // Verificar se o navegador suporta WebAuthn
      if (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === 'function'
      ) {
        // Verificar se o dispositivo tem sensores biométricos
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        this.isAvailable = available;
        return available;
      }
      
      this.isAvailable = false;
      return false;
    } catch (error) {
      console.error('Erro ao verificar compatibilidade biométrica:', error);
      this.isAvailable = false;
      return false;
    }
  }
  
  async registerBiometric(username = 'user') {
    try {
      const publicKeyOptions = {
        challenge: new Uint8Array([1, 2, 3, 4]),
        rp: { name: 'ERC-4337 Wallet', id: window.location.hostname },
        user: {
          id: new Uint8Array([1, 2, 3, 4]),
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: true
        },
        timeout: 60000
      };
      
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });
      
      if (!credential) {
        throw new Error('Falha na criação de credencial biométrica');
      }
      
      // Processar e armazenar credencial
      const credentialId = btoa(
        String.fromCharCode.apply(null, new Uint8Array(credential.rawId))
      );
      
      // Armazenar a credencial para uso futuro
      localStorage.setItem('bioCredentialId', credentialId);
      localStorage.setItem('bioUsername', username);
      
      // Armazenar o ID de credencial e outros dados necessários para Autenticacao
      const credentialJSON = {
        id: credentialId,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults()
      };
      
      localStorage.setItem('bioCredential', JSON.stringify(credentialJSON));
      
      return {
        credentialId,
        credential
      };
    } catch (error) {
      console.error('Erro ao registrar biometria:', error);
      throw error;
    }
  }
  
  async authenticate() {
    try {
      const credentialId = localStorage.getItem('bioCredentialId');
      
      if (!credentialId) {
        throw new Error('Nenhuma credencial biométrica encontrada');
      }
      
      // Converter o ID de credencial de base64 para ArrayBuffer
      const decodedId = atob(credentialId);
      const credIdBuffer = new Uint8Array(decodedId.length);
      for (let i = 0; i < decodedId.length; i++) {
        credIdBuffer[i] = decodedId.charCodeAt(i);
      }
      
      const authOptions = {
        challenge: new Uint8Array([1, 2, 3, 4]),
        allowCredentials: [{
          type: 'public-key',
          id: credIdBuffer.buffer,
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: 'required'
      };
      
      const assertion = await navigator.credentials.get({
        publicKey: authOptions
      });
      
      if (!assertion) {
        throw new Error('Autenticacao biométrica falhou');
      }
      
      // Verificar a resposta do servidor - em um cenário real,
      // enviaríamos esta credencial para o servidor validar
      
      return { 
        success: true,
        assertion
      };
    } catch (error) {
      console.error('Erro na Autenticacao biométrica:', error);
      throw error;
    }
  }
  
  hasStoredCredential() {
    return !!localStorage.getItem('bioCredentialId');
  }
  
  clearStoredCredential() {
    localStorage.removeItem('bioCredentialId');
    localStorage.removeItem('bioUsername');
    localStorage.removeItem('bioCredential');
  }
}

export default new BiometricService(); 