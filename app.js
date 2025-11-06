import { createIcons, MapPin, Phone, Instagram, User } from 'lucide';
import { GeminiClient } from './gemini-client.js';
import { translationService } from './translation-service.js';

// Lunai 3D Landing Page - Final Optimized Version with All Requirements
// RE-IMPLEMENTED: Full Tamil language translation feature.
// REMOVED: Professional Header
// ADDED: Scrollbar hiding CSS (Confirmed)
// ENHANCED: AI Business Analyst logic with detailed explanations and sub-service recommendations.
// FIXED: Audio visualizer simulation for fallback TTS.
// UPDATED: UI adjustments for voice panel and footer.
// NEW: Carousel effect for About and Testimonials sections.

// SETUP INSTRUCTIONS FOR EMAILJS:
// 
// 1. Create account at https://www.emailjs.com/
// 2. Add email service (Gmail, Outlook, etc.)
// 3. Create email template with these variables:
//    - {{from_name}} - Sender's name
//    - {{reply_to}} - Sender's email  
//    - {{interest_area}} - Selected interest area
//    - {{message}} - Message content
//    - {{to_email}} - Your receiving email
// 4. Get your Public Key, Service ID, and Template ID
// 5. Replace the placeholder values in EMAIL_CONFIG below:

const EMAIL_CONFIG = {
    publicKey: 'HFhe7HkgVcW6lcWNZ',     // Replace with your EmailJS public key
    serviceId: 'service_jvnfkwk',     // Replace with your EmailJS service ID
    templateId: 'template_vxw3wec'    // Replace with your EmailJS template ID
};

// EmailJS Manager Class for Professional Email Handling
class EmailManager {
    constructor() {
        this.config = EMAIL_CONFIG;
        this.isInitialized = false;
        this.rateLimitCount = 0;
        this.rateLimitWindow = 60000; // 1 minute
        this.maxEmailsPerWindow = 3;
    }

    async initialize() {
        if (typeof emailjs !== 'undefined' && this.config.publicKey !== 'YOUR_PUBLIC_KEY_HERE') {
            try {
                emailjs.init({ publicKey: this.config.publicKey });
                this.isInitialized = true;
                console.log('EmailJS initialized successfully');
                return true;
            } catch (error) {
                console.error('EmailJS initialization failed:', error);
                return false;
            }
        }
        console.warn('EmailJS not configured. Please update EMAIL_CONFIG with your credentials.');
        return false;
    }

    validateForm(formData) {
        const errors = [];
        
        if (!formData.from_name || formData.from_name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }
        
        if (!formData.reply_to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reply_to)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!formData.interest_area) {
            errors.push('Please select your area of interest');
        }
        
        if (!formData.message || formData.message.trim().length < 10) {
            errors.push('Message must be at least 10 characters long');
        }

        // Check honeypot for spam
        if (formData.honeypot && formData.honeypot.trim() !== '') {
            errors.push('Spam detected');
        }
        
        return errors;
    }

    checkRateLimit() {
        const now = Date.now();
        const windowStart = now - this.rateLimitWindow;
        
        // Reset counter if window has passed
        if (this.lastReset < windowStart) {
            this.rateLimitCount = 0;
            this.lastReset = now;
        }
        
        if (this.rateLimitCount >= this.maxEmailsPerWindow) {
            return false;
        }
        
        return true;
    }

    async sendEmail(formData) {
        if (!this.isInitialized) {
            throw new Error('EmailJS not initialized. Please configure your credentials.');
        }

        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait before sending another message.');
        }

        // Validate form data
        const errors = this.validateForm(formData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Prepare email data
        const emailData = {
            from_name: formData.from_name.trim(),
            reply_to: formData.reply_to.trim().toLowerCase(),
            interest_area: formData.interest_area,
            message: formData.message.trim(),
            to_email: formData.to_email || 'your-email@domain.com',
            sent_at: new Date().toLocaleString(),
            user_agent: navigator.userAgent
        };

        try {
            const response = await emailjs.send(
                this.config.serviceId,
                this.config.templateId,
                emailData
            );
            
            this.rateLimitCount++;
            console.log('Email sent successfully:', response);
            return response;
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }
}

// Kyutai TTS Client for Ultra-Low Latency Streaming
class KyutaiTTSClient {
  constructor(serverUrl, config) {
    this.serverUrl = serverUrl || 'wss://your-kyutai-server.com/tts';
    this.websocket = null;
    this.audioContext = null;
    this.audioBuffers = [];
    this.isConnected = false;
    this.isStreaming = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.config = {
      audioFormat: 'pcm',
      sampleRate: 24000,
      bufferSize: 4096,
      maxLatency: 500,
      streamingEnabled: true,
      ...config
    };
    
    this.onConnectionChange = null;
    this.onSpeakingChange = null;
    this.onAudioData = null;
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.connect();
    } catch (error) {
      console.log('Kyutai TTS initialization failed, using fallback:', error);
      return false;
    }
    return true;
  }

  async connect() {
    try {
      this.websocket = new WebSocket(this.serverUrl);
      this.websocket.binaryType = 'arraybuffer';
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onConnectionChange?.('connected');
          resolve();
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.websocket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleAudioData(event.data);
      } else {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.log('Invalid message format');
        }
      }
    };

    this.websocket.onclose = () => {
      this.isConnected = false;
      this.onConnectionChange?.('disconnected');
      this.attemptReconnect();
    };

    this.websocket.onerror = (error) => {
      console.log('WebSocket error:', error);
      this.onConnectionChange?.('error');
    };
  }

  handleAudioData(arrayBuffer) {
    if (!this.audioContext || !arrayBuffer.byteLength) return;

    try {
      // Convert PCM data to AudioBuffer
      this.audioContext.decodeAudioData(arrayBuffer.slice(), (audioBuffer) => {
        this.playAudioBuffer(audioBuffer);
        this.onAudioData?.(audioBuffer);
      }).catch(() => {
        // Handle raw PCM data
        const floatArray = new Float32Array(arrayBuffer);
        const audioBuffer = this.audioContext.createBuffer(1, floatArray.length, this.config.sampleRate);
        audioBuffer.copyToChannel(floatArray, 0);
        this.playAudioBuffer(audioBuffer);
        this.onAudioData?.(audioBuffer);
      });
    } catch (error) {
      console.log('Audio processing error:', error);
    }
  }

  playAudioBuffer(audioBuffer) {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    gainNode.gain.value = 0.7; // Adjust volume
    source.start();
  }

  handleMessage(message) {
    switch (message.type) {
      case 'speaking_start':
        this.isStreaming = true;
        this.onSpeakingChange?.(true);
        break;
      case 'speaking_end':
        this.isStreaming = false;
        this.onSpeakingChange?.(false);
        break;
      case 'error':
        console.log('Kyutai TTS error:', message.error);
        break;
    }
  }

  async speak(text, voice = 'nova', options = {}) {
    if (!this.isConnected || !text.trim()) return false;

    const message = {
      text: text,
      voice: voice,
      streaming: true,
      format: this.config.audioFormat,
      sample_rate: this.config.sampleRate,
      ...options
    };

    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.log('Failed to send message:', error);
      return false;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.onConnectionChange?.('reconnecting');
    
    setTimeout(() => {
      this.connect().catch(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts} failed`);
      });
    }, Math.pow(2, this.reconnectAttempts) * 1000);
  }

  handleConnectionError(error) {
    console.log('Kyutai connection error:', error);
    this.isConnected = false;
    this.onConnectionChange?.('error');
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }
}

// Enhanced Lunai Experience with All Final Requirements
class EnhancedLunaiExperience {
  constructor() {
    this.kyutaiClient = null;
    this.fallbackTTS = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.visualizerData = null;
    this.isAudioInitialized = false;
    this.emailManager = new EmailManager();
    this.geminiClient = new GeminiClient(import.meta.env.VITE_GEMINI_API_KEY);
    
    // Voice and audio settings
    this.currentVoice = 'stellar';
    this.currentVolume = 0.7;
    this.isMuted = false;
    this.isVoicePanelExpanded = false;
    
    // Visual effects
    this.particles = [];
    this.cursorTrails = [];
    this.scrollY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isSpeaking = false;
    
    // Services section state
    this.expandedService = null;
    this.servicesSectionAnimated = false;
    this.raLunaiAnimated = false;
    
    // Notification system
    this.notificationContainer = null;

    this.voices = {
      nova: { name: "Nova", personality: "Serene cosmic guide", pitch: 1.2, gender: "female" },
      stellar: { name: "Stellar", personality: "Bold space pioneer", pitch: 1.0, gender: "female" },
      cosmos: { name: "Cosmos", personality: "Wise universal narrator", pitch: 0.8, gender: "male" },
      eclipse: { name: "Eclipse", personality: "Enigmatic celestial entity", pitch: 0.6, gender: "male" }
    };
    
    this.init();
  }

  async init() {
    translationService.init();
    await this.initAudio();
    await this.initEmailJS();
    this.geminiClient.init(); // This is now synchronous
    this.initKyutaiTTS();
    this.initFallbackTTS();
    this.setupUI();
    this.createParticles();
    this.initScrollAnimations();
    this.initEnhancedFormHandling();
    this.initCursorEffects();
    this.initVoiceControls();
    this.initSoundEffects();
    this.initMobileOptimizations();
    this.initVisualizer();
    this.initRefinedLogo();
    this.initServicesSection();
    this.initAIStrategist();
    this.initRaLunaiFeature();
    this.initAboutSection();
    this.initTestimonials();
    this.initMarquees();
    this.initLucideIcons();
    this.initResponsiveOptimizations();
    this.initNotifications();
    this.initLanguageSwitcher();
    
    this.animate();
    
    setTimeout(() => {
      this.showAudioPanel();
      this.startVoiceExperience();
    }, 1500);
  }

  initLanguageSwitcher() {
    const toggleBtn = document.getElementById('languageToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const previousLang = translationService.currentLanguage;
            const newLang = translationService.toggleLanguage();
            // If switching TO Tamil, show the notification
            if (newLang === 'ta' && previousLang !== 'ta') {
                this.showNotification(translationService.getTranslation('ttsQualityWarning'));
            }
            // Re-speak a welcome message in the new language
            this.speak(translationService.getTranslation('voiceWelcome'));
        });
    }
  }

  initNotifications() {
    this.notificationContainer = document.getElementById('notification-container');
  }

  showNotification(message, duration = 8000) {
    if (!this.notificationContainer) return;
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = message;
    this.notificationContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.5s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.parentNode?.removeChild(toast);
        });
    }, duration);
  }

  initResponsiveOptimizations() {
    this.deviceType = this.getDeviceType();
    document.body.classList.add(`device-${this.deviceType}`);
    
    if (this.deviceType === 'mobile') {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.handleOrientationChange(), 500);
      });
    }
    
    window.addEventListener('resize', () => this.handleResize());
    
    console.log(`Initialized for ${this.deviceType} device`);
  }

  getDeviceType() {
    const width = window.innerWidth;
    if (width >= 1200) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
  }

  handleOrientationChange() {
    this.deviceType = this.getDeviceType();
    document.body.className = document.body.className.replace(/device-\w+/, `device-${this.deviceType}`);
    
    if (this.deviceType === 'mobile') {
      this.particles = this.particles.slice(0, 10);
    }
  }

  handleResize() {
    const newDeviceType = this.getDeviceType();
    if (newDeviceType !== this.deviceType) {
      this.deviceType = newDeviceType;
      document.body.className = document.body.className.replace(/device-\w+/, `device-${this.deviceType}`);
      this.adjustEffectsForDevice();
    }
  }

  adjustEffectsForDevice() {
    switch (this.deviceType) {
      case 'mobile':
        this.particles = this.particles.slice(0, 10);
        break;
      case 'tablet':
        this.particles = this.particles.slice(0, 15);
        break;
      case 'desktop':
        break;
    }
  }

  initMarquees() {
    const marqueeTracks = document.querySelectorAll('.marquee-track');
    marqueeTracks.forEach(track => {
        if (track.dataset.marqueeInitialized) return;

        const children = Array.from(track.children);
        if (children.length > 0) {
            children.forEach(child => {
                child.removeAttribute('data-aos');
                child.style.opacity = '1';
                child.style.transform = 'none';
                const clone = child.cloneNode(true);
                track.appendChild(clone);
            });
        }
        
        track.dataset.marqueeInitialized = 'true';
    });
    console.log('Marquee carousels initialized.');
  }

  initAboutSection() {
    console.log('About section initialized for marquee.');
  }

  initRaLunaiFeature() {
    const raLunaiFeature = document.querySelector('.ra-lunai-feature');
    if (!raLunaiFeature) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.raLunaiAnimated) {
          this.raLunaiAnimated = true;
          raLunaiFeature.classList.add('animate');
          if (this.isAudioInitialized) {
            setTimeout(() => this.speak(translationService.getTranslation('voiceRaLunai')), 1000);
          }
          this.createRaLunaiEffects(raLunaiFeature);
        }
      });
    }, { 
      threshold: 0.5,
      rootMargin: '-100px'
    });

    observer.observe(raLunaiFeature);

    raLunaiFeature.addEventListener('mouseenter', () => {
      if (this.isAudioInitialized) {
        setTimeout(() => this.speak(translationService.getTranslation('voiceRaLunaiHover')), 300);
      }
      this.createCosmicRipple(raLunaiFeature);
    });
  }

  createRaLunaiEffects(element) {
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute; width: 6px; height: 6px;
        background: linear-gradient(45deg, #00ffff, #00ff88);
        border-radius: 50%; pointer-events: none; z-index: 1000;
        left: 50%; top: 50%; transform: translate(-50%, -50%);
      `;
      element.appendChild(particle);
      const angle = (i / 12) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      const duration = 2000 + Math.random() * 1000;
      particle.animate([
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance - 50}%, ${Math.sin(angle) * distance - 50}%) scale(1)`, opacity: 0 }
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' })
      .addEventListener('finish', () => particle.parentNode?.removeChild(particle));
    }
    this.playSound('cosmic', 600, 0.4);
  }

  createCosmicRipple(element) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed; width: 40px; height: 40px;
      background: radial-gradient(circle, rgba(0, 255, 255, 0.4) 0%, transparent 70%);
      border-radius: 50%; pointer-events: none; z-index: 999;
      left: ${rect.left + rect.width / 2 - 20}px;
      top: ${rect.top + rect.height / 2 - 20}px;
      transform: scale(0);
    `;
    document.body.appendChild(ripple);
    ripple.animate([
      { transform: 'scale(0)', opacity: 1 },
      { transform: 'scale(5)', opacity: 0 }
    ], { duration: 1000, easing: 'ease-out' })
    .addEventListener('finish', () => ripple.parentNode?.removeChild(ripple));
  }

  initTestimonials() {
    const testimonialStars = document.querySelectorAll('.testimonial-star');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('animate');
            this.playSound('ping', 800 + index * 200, 0.3);
          }, index * 300);
        }
      });
    }, { threshold: 0.3, rootMargin: '-50px' });

    testimonialStars.forEach(star => {
      observer.observe(star);
      star.addEventListener('mouseenter', () => {
        if (this.isAudioInitialized) {
          const cite = star.querySelector('cite').textContent;
          let voiceKey = 'testimonialPriya';
          if (cite.includes('Rajesh') || cite.includes('ராஜேஷ்')) voiceKey = 'testimonialRajesh';
          if (cite.includes('Kavitha') || cite.includes('கவிதா')) voiceKey = 'testimonialKavitha';
          setTimeout(() => this.speak(translationService.getTranslation(voiceKey)), 300);
        }
        this.createStarBurst(star);
      });
    });
  }

  createStarBurst(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      star.style.cssText = `
        position: fixed; width: 4px; height: 4px;
        background: #00ffff; border-radius: 50%;
        pointer-events: none; z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        box-shadow: 0 0 10px #00ffff;
      `;
      document.body.appendChild(star);
      const angle = (i / 8) * Math.PI * 2;
      const distance = 80 + Math.random() * 40;
      const duration = 1200 + Math.random() * 400;
      star.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance - 50}%, ${Math.sin(angle) * distance - 50}%) scale(0)`, opacity: 0 }
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' })
      .addEventListener('finish', () => star.parentNode?.removeChild(star));
    }
  }

  initLucideIcons() {
    if (typeof createIcons !== 'undefined') {
        createIcons({ icons: { MapPin, Phone, Instagram, User } });
    }
  }

  async initEmailJS() {
    const success = await this.emailManager.initialize();
    if (success) {
      console.log('Email system ready.');
    } else {
      console.log('Email system using demo mode.');
    }
  }

  initRefinedLogo() {
    const logoText = document.getElementById('logoText');
    const logoBackdrop = document.getElementById('logoBackdrop');
    if (logoText) {
      logoText.style.background = 'linear-gradient(45deg, #E8E8E8, #C0C0C0, #A0A0A0, #C0C0C0)';
      logoText.style.backgroundSize = '300% 100%';
      logoText.style.webkitBackgroundClip = 'text';
      logoText.style.webkitTextFillColor = 'transparent';
      logoText.style.backgroundClip = 'text';
      logoText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 255, 0.3)';
      logoText.style.position = 'relative';
      logoText.style.zIndex = '2';
      logoText.style.animation = 'none';
      logoText.style.fontFamily = '"Orbitron", monospace';
      logoText.style.fontWeight = '900';
      logoText.style.textRendering = 'optimizeLegibility';
    }
    if (logoBackdrop) {
      logoBackdrop.style.background = 'radial-gradient(ellipse, rgba(0, 0, 0, 0.3) 0%, transparent 70%)';
      logoBackdrop.style.position = 'absolute';
      logoBackdrop.style.top = '50%';
      logoBackdrop.style.left = '50%';
      logoBackdrop.style.transform = 'translate(-50%, -50%)';
      logoBackdrop.style.borderRadius = '50%';
      logoBackdrop.style.zIndex = '1';
    }
    console.log('Refined chrome logo initialized.');
  }

  initServicesSection() {
    this.setupServiceCards();
    this.setupServicesObserver();
  }

  setupServiceCards() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
      const expandBtn = card.querySelector('.service-expand-btn');
      const serviceType = card.dataset.service;
      card.addEventListener('mouseenter', () => {
        if (this.isAudioInitialized) {
          const translationKey = `service${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}`;
          setTimeout(() => this.speak(translationService.getTranslation(translationKey)), 300);
        }
        this.createParticleEffect(card);
        this.playSound('hover', 600, 0.15);
      });
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleServiceCard(card, serviceType);
        });
      }
      card.addEventListener('click', (e) => {
        if (e.target.closest('.service-list') || e.target.closest('.service-expand-btn')) return;
        this.toggleServiceCard(card, serviceType);
      });
    });
  }

  toggleServiceCard(card, serviceType) {
    const isCurrentlyExpanded = card.classList.contains('expanded');
    const expandBtnSpan = card.querySelector('.service-expand-btn span');
    const serviceList = card.querySelector('.service-list');
    if (isCurrentlyExpanded) {
      card.classList.remove('expanded');
      this.expandedService = null;
      if (expandBtnSpan) expandBtnSpan.textContent = translationService.getTranslation('exploreServices');
      if (serviceList) {
        serviceList.style.maxHeight = '0';
        serviceList.style.opacity = '0';
      }
      this.speak(translationService.getTranslation('serviceDetailsCollapsed'));
      setTimeout(() => {
        card.style.gridColumn = '';
        card.style.maxWidth = '';
        card.style.margin = '';
      }, 300);
    } else {
      if (this.expandedService && this.expandedService !== card) {
        this.expandedService.classList.remove('expanded');
        const prevExpandBtnSpan = this.expandedService.querySelector('.service-expand-btn span');
        const prevServiceList = this.expandedService.querySelector('.service-list');
        if (prevExpandBtnSpan) prevExpandBtnSpan.textContent = translationService.getTranslation('exploreServices');
        if (prevServiceList) {
          prevServiceList.style.maxHeight = '0';
          prevServiceList.style.opacity = '0';
        }
        this.expandedService.style.gridColumn = '';
        this.expandedService.style.maxWidth = '';
        this.expandedService.style.margin = '';
      }
      card.classList.add('expanded');
      this.expandedService = card;
      if (expandBtnSpan) expandBtnSpan.textContent = translationService.getTranslation('collapseServices');
      if (serviceList) {
        serviceList.style.maxHeight = '400px';
        serviceList.style.opacity = '1';
      }
      const serviceTitle = card.querySelector('.service-title').textContent;
      this.speak(translationService.getTranslation('exploringService', { serviceTitle }));
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    }
    this.playSound('click', isCurrentlyExpanded ? 300 : 500, 0.3);
    this.createExpandEffect(card);
  }

  createParticleEffect(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: fixed; width: 4px; height: 4px; background: #00ffff;
        border-radius: 50%; pointer-events: none; z-index: 1000;
        left: ${rect.left + rect.width / 2}px; top: ${rect.top + rect.height / 2}px; opacity: 1;
      `;
      document.body.appendChild(particle);
      const angle = (i / 8) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const duration = 800 + Math.random() * 400;
      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 }
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' })
      .addEventListener('finish', () => particle.parentNode?.removeChild(particle));
    }
  }

  createExpandEffect(element) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed; width: 20px; height: 20px;
      background: radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%);
      border-radius: 50%; pointer-events: none; z-index: 999;
      left: ${rect.left + rect.width / 2 - 10}px; top: ${rect.top + rect.height / 2 - 10}px;
      transform: scale(0);
    `;
    document.body.appendChild(ripple);
    ripple.animate([
      { transform: 'scale(0)', opacity: 1 },
      { transform: 'scale(3)', opacity: 0 }
    ], { duration: 600, easing: 'ease-out' })
    .addEventListener('finish', () => ripple.parentNode?.removeChild(ripple));
  }

  setupServicesObserver() {
    const servicesSection = document.getElementById('services');
    if (!servicesSection) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.servicesSectionAnimated) {
          this.servicesSectionAnimated = true;
          this.animateServiceCards();
          if (this.isAudioInitialized) {
            setTimeout(() => this.speak(translationService.getTranslation('voiceServices')), 800);
          }
        }
      });
    }, { threshold: 0.3, rootMargin: '-100px' });
    observer.observe(servicesSection);
  }

  animateServiceCards() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
      const delay = parseInt(card.dataset.delay) || index * 200;
      setTimeout(() => {
        card.classList.add('animate');
        this.playSound('ping', 800 + index * 100, 0.2);
      }, delay);
    });
  }

  initEnhancedFormHandling() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const dropdown = document.getElementById('contactInterest');
    if (dropdown) {
      dropdown.addEventListener('change', (e) => {
        this.clearFieldError(e.target);
        if (this.isAudioInitialized && e.target.value) {
          const selectedText = e.target.options[e.target.selectedIndex].text;
          this.speak(translationService.getTranslation('selected', { option: selectedText }));
        }
      });
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEnhancedFormSubmission(form);
    });
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      let hasBeenTouched = false;
      input.addEventListener('focus', () => this.clearFieldError(input));
      input.addEventListener('blur', () => {
        hasBeenTouched = true;
        if (input.value.trim() || input.tagName === 'SELECT') this.validateField(input);
      });
      input.addEventListener('input', () => {
        this.clearFieldError(input);
        if (hasBeenTouched && input.value.trim()) setTimeout(() => this.validateField(input), 500);
      });
      input.addEventListener('change', () => {
        hasBeenTouched = true;
        this.clearFieldError(input);
        this.validateField(input);
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    switch (fieldName) {
      case 'from_name':
        if (value.length < 2) {
          isValid = false;
          errorMessage = 'Name must be at least 2 characters';
        }
        break;
      case 'reply_to':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;
      case 'interest_area':
        if (!value || value === '') {
          isValid = false;
          errorMessage = 'Please select your area of interest';
        }
        break;
      case 'message':
        if (value.length < 10) {
          isValid = false;
          errorMessage = 'Message must be at least 10 characters';
        }
        break;
    }
    if (!isValid) this.showFieldError(field, errorMessage);
    else this.clearFieldError(field);
    return isValid;
  }

  showFieldError(field, message) {
    field.style.borderColor = '#ff4444';
    field.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
    field.classList.add('error');
    if (this.isAudioInitialized && !field.hasAttribute('data-error-spoken')) {
      field.setAttribute('data-error-spoken', 'true');
      setTimeout(() => {
        this.speak(message);
        setTimeout(() => field.removeAttribute('data-error-spoken'), 3000);
      }, 100);
    }
  }

  clearFieldError(field) {
    field.style.borderColor = '';
    field.style.boxShadow = '';
    field.classList.remove('error');
    field.removeAttribute('data-error-spoken');
  }

  async handleEnhancedFormSubmission(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    this.clearFormMessage(formMessage);
    const allInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isFormValid = true;
    let firstInvalidField = null;
    allInputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
        if (!firstInvalidField) firstInvalidField = input;
      }
    });
    if (!isFormValid) {
      this.showFormMessage(formMessage, translationService.getTranslation('emailValidation'), 'error');
      if (this.isAudioInitialized) this.speak(translationService.getTranslation('emailValidation'));
      if (firstInvalidField) {
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    try {
      this.setFormLoadingState(submitBtn, btnText, btnLoading, true);
      this.showFormMessage(formMessage, translationService.getTranslation('emailLoading'), 'loading');
      if (this.isAudioInitialized) this.speak(translationService.getTranslation('emailLoading'));
      if (this.emailManager.isInitialized) await this.emailManager.sendEmail(data);
      else await new Promise(resolve => setTimeout(resolve, 2000));
      this.setFormSuccessState(submitBtn, btnText, btnLoading);
      this.showFormMessage(formMessage, translationService.getTranslation('emailSuccess'), 'success');
      if (this.isAudioInitialized) this.speak(translationService.getTranslation('emailSuccess'));
      this.createSuccessParticles(submitBtn);
      this.playSound('success', 800, 0.5);
      setTimeout(() => {
        form.reset();
        this.resetFormState(submitBtn, btnText, btnLoading);
        this.clearFormMessage(formMessage);
        allInputs.forEach(input => this.clearFieldError(input));
      }, 5000);
    } catch (error) {
      console.error('Form submission error:', error);
      this.setFormErrorState(submitBtn, btnText, btnLoading);
      let errorMessage = translationService.getTranslation('emailError');
      if (error.message.includes('not initialized')) errorMessage = 'Email system not configured. This is a demo.';
      else if (error.message.includes('Rate limit')) errorMessage = 'Too many messages sent. Please wait a moment.';
      else if (error.message) errorMessage = error.message;
      this.showFormMessage(formMessage, errorMessage, 'error');
      if (this.isAudioInitialized) this.speak(translationService.getTranslation('emailError'));
      this.playSound('error', 300, 0.4);
      setTimeout(() => this.resetFormState(submitBtn, btnText, btnLoading), 3000);
    }
  }

  setFormLoadingState(submitBtn, btnText, btnLoading, loading) {
    if (loading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      btnText.style.opacity = '0';
      btnLoading.style.opacity = '1';
    }
  }

  setFormSuccessState(submitBtn, btnText, btnLoading) {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    btnText.textContent = translationService.getTranslation('messageLaunched');
    btnText.style.opacity = '1';
    btnLoading.style.opacity = '0';
  }

  setFormErrorState(submitBtn, btnText, btnLoading) {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('error');
    btnText.textContent = translationService.getTranslation('transmissionFailed');
    btnText.style.opacity = '1';
    btnLoading.style.opacity = '0';
  }

  resetFormState(submitBtn, btnText, btnLoading) {
    submitBtn.classList.remove('loading', 'success', 'error');
    submitBtn.disabled = false;
    btnText.textContent = translationService.getTranslation('launchMessage');
    btnText.style.opacity = '1';
    btnLoading.style.opacity = '0';
  }

  showFormMessage(messageEl, text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `form-message ${type} show`;
    messageEl.style.display = 'block';
    messageEl.style.opacity = '1';
    messageEl.style.transform = 'translateY(0)';
  }

  clearFormMessage(messageEl) {
    if (!messageEl) return;
    messageEl.classList.remove('show');
    setTimeout(() => {
      messageEl.className = 'form-message';
      messageEl.textContent = '';
      messageEl.style.display = 'none';
    }, 300);
  }

  createSuccessParticles(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const particle = document.createElement('div');
      particle.className = 'success-particle';
      particle.style.cssText = `
        position: fixed; width: 6px; height: 6px; background: #00ff88;
        border-radius: 50%; pointer-events: none; z-index: 1000;
        left: ${rect.left + rect.width / 2}px; top: ${rect.top + rect.height / 2}px;
      `;
      document.body.appendChild(particle);
      const angle = (i / 16) * Math.PI * 2;
      const distance = 100 + Math.random() * 50;
      const duration = 1000 + Math.random() * 500;
      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 }
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' })
      .addEventListener('finish', () => particle.parentNode?.removeChild(particle));
    }
  }

  async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createAmbientSounds();
      this.setupAnalyser();
    } catch (error) {
      console.log('Audio context not supported');
    }
  }

  async initKyutaiTTS() {
    const config = {
      audioFormat: 'pcm', sampleRate: 24000, bufferSize: 4096,
      maxLatency: 500, streamingEnabled: true
    };
    this.kyutaiClient = new KyutaiTTSClient('wss://your-kyutai-server.com/tts', config);
    this.kyutaiClient.onConnectionChange = (status) => this.updateConnectionStatus(status);
    this.kyutaiClient.onSpeakingChange = (speaking) => this.updateSpeakingState(speaking);
    this.kyutaiClient.onAudioData = (audioBuffer) => this.updateAudioVisualization(audioBuffer);
    try {
      await this.kyutaiClient.init();
      console.log('Kyutai TTS initialized successfully');
    } catch (error) {
      console.log('Kyutai TTS failed, will use fallback');
      this.updateConnectionStatus('fallback');
    }
  }

  initFallbackTTS() {
    if ('speechSynthesis' in window) {
      this.fallbackTTS = speechSynthesis;
      const loadVoices = () => {
        const voices = this.fallbackTTS.getVoices();
        if (voices.length > 0) console.log('Available voices:', voices.length);
      };
      this.fallbackTTS.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    }
  }

  setupUI() {
    this.setupAudioControls();
    this.setupVoiceSelection();
    this.setupConnectionStatus();
  }

  showAudioPanel() {
    const toggleButton = document.getElementById('toggleAudioPanel');
    if (toggleButton) {
        toggleButton.style.opacity = '0.7';
        toggleButton.style.transform = 'translateX(0)';
    }
  }

  setupAudioControls() {
    const toggleBtn = document.getElementById('toggleAudioPanel');
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleAudioPanel(); });
    if (muteBtn) muteBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.isMuted = !this.isMuted;
      this.updateAudioVolume();
      muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
    });
    if (volumeSlider) volumeSlider.addEventListener('input', (e) => {
      this.currentVolume = e.target.value / 100;
      this.updateAudioVolume();
    });
  }

  setupVoiceSelection() {
    const voiceButtons = document.querySelectorAll('.voice-btn');
    voiceButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.selectVoice(btn.dataset.voice);
        this.updateVoiceUI();
      });
    });
  }

  setupConnectionStatus() {
    this.updateConnectionStatus('disconnected');
  }

  toggleAudioPanel() {
    const panel = document.getElementById('audioPanel');
    this.isVoicePanelExpanded = !this.isVoicePanelExpanded;
    if (panel) panel.classList.toggle('is-open', this.isVoicePanelExpanded);
  }

  selectVoice(voiceId) {
    this.currentVoice = voiceId;
    this.updateVoiceUI();
    this.speak(translationService.getTranslation('selected', { option: this.voices[voiceId].name }));
  }

  updateVoiceUI() {
    const voiceButtons = document.querySelectorAll('.voice-btn');
    voiceButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.voice === this.currentVoice));
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = statusElement?.querySelector('.status-dot');
    const statusText = statusElement?.querySelector('.status-text');
    if (!statusElement || !statusDot || !statusText) return;
    statusDot.className = `status-dot ${status}`;
    const statusMessages = {
      connected: 'Connected to Kyutai TTS', connecting: 'Connecting to Kyutai...',
      reconnecting: 'Reconnecting...', disconnected: 'Disconnected',
      error: 'Connection Error', fallback: 'Using Web Speech API'
    };
    statusText.textContent = statusMessages[status] || 'Unknown Status';
  }

  updateSpeakingState(speaking) {
    this.isSpeaking = speaking;
    document.getElementById('speakingIndicator')?.classList.toggle('active', speaking);
    document.getElementById('audioVisualizer')?.classList.toggle('active', speaking);
    this.syncVisualElements(speaking);
  }

  syncVisualElements(speaking) {
    document.querySelector('.logo-text')?.classList.toggle('speaking', speaking);
    document.querySelectorAll('.crescent').forEach(c => c.classList.toggle('voice-reactive', speaking));
    document.querySelectorAll('.service-card, .feature-card').forEach(c => c.classList.toggle('speaking', speaking));
  }

  async speak(text, voice = this.currentVoice) {
    if (!text || this.isMuted) return false;
    const voiceInfo = this.voices[voice];
    if (this.kyutaiClient?.isConnected) {
      const success = await this.kyutaiClient.speak(text, voice, {
        rate: 1.0, pitch: voiceInfo.pitch, volume: this.currentVolume
      });
      if (success) return true;
    }
    return this.speakWithFallback(text, voice);
  }

  speakWithFallback(text, voice) {
    if (!this.fallbackTTS) return false;
    this.fallbackTTS.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceInfo = this.voices[voice];
    const currentLang = translationService.currentLanguage;

    utterance.lang = currentLang;
    utterance.rate = 1.0;
    utterance.pitch = voiceInfo.pitch;
    utterance.volume = this.isMuted ? 0 : this.currentVolume;

    const allVoices = this.fallbackTTS.getVoices();
    let selectedVoice = null;

    if (allVoices.length > 0) {
        const langVoices = allVoices.filter(v => v.lang.startsWith(currentLang));
        if (langVoices.length > 0) {
            selectedVoice = langVoices.find(v => v.name.toLowerCase().includes(voiceInfo.gender)) || langVoices[0];
        }
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Using fallback voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${currentLang}`);
    } else {
        console.warn(`No specific voice found for language '${currentLang}'. Using browser default.`);
    }

    utterance.onstart = () => this.updateSpeakingState(true);
    utterance.onend = () => this.updateSpeakingState(false);
    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return;
      console.error('An unexpected speech synthesis error occurred:', e);
      this.updateSpeakingState(false);
    };

    this.fallbackTTS.speak(utterance);
    return true;
  }

  setupAnalyser() {
    if (!this.audioContext) return;
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 128;
    this.visualizerData = new Uint8Array(this.analyserNode.frequencyBinCount);
  }

  initVisualizer() {
    const canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      if (this.isSpeaking) {
        if (this.analyserNode && this.visualizerData && this.kyutaiClient?.isConnected) {
          this.analyserNode.getByteFrequencyData(this.visualizerData);
        } else {
          const time = Date.now() * 0.005;
          for (let i = 0; i < this.visualizerData.length; i++) {
            const sinWave = (Math.sin(time + i * 0.2) + 1) / 2;
            const noise = Math.random() * 0.2;
            this.visualizerData[i] = (sinWave + noise) * 128 + 64;
          }
        }
        const barCount = 32;
        const barWidth = (canvas.offsetWidth / barCount);
        let x = 0;
        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (this.visualizerData.length / barCount));
          const barHeight = (this.visualizerData[dataIndex] / 255) * canvas.offsetHeight * 0.9;
          const hue = (i / barCount) * 180 + 180;
          ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
          ctx.fillRect(x, canvas.offsetHeight - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      }
    };
    draw();
  }

  updateAudioVisualization(audioBuffer) {
    if (!this.analyserNode || !audioBuffer) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  async startVoiceExperience() {
    const initAudio = async () => {
      if (this.audioContext?.state === 'suspended') await this.audioContext.resume();
      this.isAudioInitialized = true;
      this.updateConnectionStatus('fallback');
    };
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    try {
      await initAudio();
    } catch (error) {
      console.log('Waiting for user interaction to start audio');
    }
  }

  initVoiceControls() {
    const welcomeBtn = document.getElementById('voiceWelcome');
    if (welcomeBtn) {
      welcomeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!this.isAudioInitialized) await this.startVoiceExperience();
        await this.speak(translationService.getTranslation('voiceWelcome'));
      });
    }
    this.setupNarrationTriggers();
    this.setupInteractiveNarration();
  }

  setupNarrationTriggers() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.dataset.narrate) {
          let contentKey = entry.target.dataset.narrate;
          let content = translationService.getTranslation(contentKey);
          if (content && this.isAudioInitialized) {
            setTimeout(() => this.speak(content), 800);
          }
        }
      });
    }, { threshold: 0.5, rootMargin: '-100px' });
    document.querySelectorAll('[data-narrate]').forEach(el => observer.observe(el));
  }

  setupInteractiveNarration() {
    document.querySelectorAll('.feature-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (this.isAudioInitialized) {
          setTimeout(() => this.speak(translationService.getTranslation('interactionHover')), 300);
        }
      });
    });
    document.querySelectorAll('[data-narrate="true"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAudioInitialized) this.speak(translationService.getTranslation('interactionClick'));
      });
    });
    document.querySelectorAll('[data-speak-on-focus="true"]').forEach(input => {
      input.addEventListener('focus', (e) => {
        if (this.isAudioInitialized) {
          const label = e.target.previousElementSibling?.textContent || e.target.getAttribute('placeholder') || 'Input field focused';
          this.speak(translationService.getTranslation('fieldSelected', { label }));
          e.target.classList.add('speaking-focus');
          setTimeout(() => e.target.classList.remove('speaking-focus'), 2000);
        }
      });
    });
  }

  createAmbientSounds() {
    if (!this.audioContext) return;
    const createOscillator = (frequency, type = 'sine') => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      return { oscillator, gainNode };
    };
    const cosmicHum = createOscillator(40, 'sine');
    cosmicHum.oscillator.start();
    const stellarWind = createOscillator(120, 'triangle');
    stellarWind.gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime);
    stellarWind.oscillator.start();
  }

  updateAudioVolume() {
    const volume = this.isMuted ? 0 : this.currentVolume;
    if (this.audioContext) this.audioContext.destination.volume = volume;
  }

  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const frequency = this.deviceType === 'mobile' ? 1000 : 500;
    const maxParticles = this.deviceType === 'mobile' ? 10 : 20;
    setInterval(() => {
      if (this.particles.length < maxParticles) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(particle);
        this.particles.push(particle);
        setTimeout(() => {
          particle.parentNode?.removeChild(particle);
          this.particles = this.particles.filter(p => p !== particle);
        }, 8000);
      }
    }, frequency);
  }

  initScrollAnimations() {
    window.addEventListener('scroll', () => {
      this.scrollY = window.pageYOffset;
      this.updateLogoFloat();
      this.checkAnimationTriggers();
    });
  }

  updateLogoFloat() {
    const logo = document.getElementById('logo3d');
    if (logo) {
      const progress = Math.min(this.scrollY / window.innerHeight, 1);
      const opacity = 1 - progress;
      const translateY = -this.scrollY * 0.3;
      const rotateY = progress * 180;
      logo.style.transform = `translateY(${translateY}px) rotateY(${rotateY}deg)`;
      logo.style.opacity = opacity;
    }
  }

  checkAnimationTriggers() {
    const elements = document.querySelectorAll('[data-aos]');
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const triggerPoint = window.innerHeight * 0.8;
      if (rect.top < triggerPoint && !element.classList.contains('animate')) {
        const delay = element.dataset.delay || 0;
        setTimeout(() => {
          element.classList.add('animate');
          this.playSound('ping', 800, 0.2);
        }, parseInt(delay));
      }
    });
  }

  initCursorEffects() {
    let trails = [];
    const maxTrails = this.deviceType === 'mobile' ? 5 : 10;
    if (!('ontouchstart' in window)) {
      document.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
        document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
        if (trails.length >= maxTrails) {
          const oldTrail = trails.shift();
          oldTrail?.parentNode?.removeChild(oldTrail);
        }
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        trail.style.opacity = '1';
        document.body.appendChild(trail);
        trails.push(trail);
        setTimeout(() => {
          trail.style.opacity = '0';
          setTimeout(() => trail.parentNode?.removeChild(trail), 300);
        }, 50);
      });
    }
  }

  initSoundEffects() {
    const buttons = document.querySelectorAll('button, .btn, .cta-btn, .service-expand-btn');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => this.playSound('hover', 800, 0.1));
      button.addEventListener('click', () => this.playSound('click', 400, 0.2));
    });
    const cards = document.querySelectorAll('.feature-card, .service-card');
    cards.forEach(card => card.addEventListener('mouseenter', () => this.playSound('ping', 600, 0.15)));
  }

  playSound(type, frequency = 440, duration = 0.1) {
    if (!this.audioContext || this.isMuted) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    switch (type) {
      case 'cosmic': oscillator.type = 'sawtooth'; break;
      case 'success': oscillator.type = 'square'; break;
      case 'error': oscillator.type = 'triangle'; break;
      default: oscillator.type = 'sine';
    }
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.currentVolume * 0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  initMobileOptimizations() {
    if (this.deviceType === 'mobile') {
      this.particles = this.particles.slice(0, 10);
      document.body.classList.add('mobile-optimized');
      let touchStartY = 0;
      document.addEventListener('touchstart', (e) => touchStartY = e.touches[0].clientY);
      document.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;
        if (Math.abs(deltaY) > 50) {
          this.playSound('swipe', 300, 0.1);
          touchStartY = touchY;
        }
      });
    }
  }

  animate() {
    const time = Date.now() * 0.001;
    const logoText = document.querySelector('.logo-text');
    if (logoText && this.scrollY < window.innerHeight) {
      const baseTransform = `rotateX(${Math.sin(time * 0.5) * 2}deg) rotateY(${Math.cos(time * 0.3) * 1}deg)`;
      logoText.style.transform = baseTransform;
    }
    const leftCrescent = document.querySelector('.left-crescent');
    const rightCrescent = document.querySelector('.right-crescent');
    if (leftCrescent) leftCrescent.style.transform = `rotate(${time * 20}deg)`;
    if (rightCrescent) rightCrescent.style.transform = `rotate(${-time * 20}deg)`;
    requestAnimationFrame(() => this.animate());
  }
  
  initAIStrategist() {
    const interfaceEl = document.getElementById('strategistInterface');
    if (!interfaceEl) return;
    const steps = [
        document.getElementById('strategistStep1'),
        document.getElementById('strategistStep2'),
        document.getElementById('strategistStep3')
    ];
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressBar = document.getElementById('strategistProgressBar');
    const formContainer = document.querySelector('.strategist-form-container');
    let currentStep = 0;
    const updateUI = () => {
        steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
        progressSteps.forEach((step, index) => step.classList.toggle('active', index <= currentStep));
        progressBar.style.width = `${(currentStep / (steps.length - 1)) * 100}%`;
        const activeStepEl = steps[currentStep];
        if (formContainer && activeStepEl) formContainer.style.minHeight = `${activeStepEl.scrollHeight}px`;
    };
    document.getElementById('strategistNext1').addEventListener('click', () => {
        const industry = document.getElementById('businessIndustry').value;
        const size = document.getElementById('businessSize').value;
        if (industry && size) {
            currentStep = 1;
            updateUI();
        } else {
            this.speak(translationService.getTranslation('selectIndustrySize'));
        }
    });
    document.getElementById('strategistBack1').addEventListener('click', () => {
        currentStep = 0;
        updateUI();
    });
    document.getElementById('getRecommendationsBtn').addEventListener('click', async () => {
        const challenges = document.getElementById('businessChallenges').value;
        if (challenges.trim()) {
            currentStep = 2;
            updateUI();
            await this.runAnalysis();
        } else {
            this.speak(translationService.getTranslation('describeYourChallenges'));
        }
    });
    updateUI();
  }

  async runAnalysis() {
    const loadingEl = document.getElementById('strategistLoading');
    const resultsEl = document.getElementById('strategistResults');
    loadingEl.style.display = 'flex';
    resultsEl.style.display = 'none';
    this.speak(translationService.getTranslation('aiStrategistAnalyzing'));
    const formContainer = document.querySelector('.strategist-form-container');
    const activeStepEl = document.getElementById('strategistStep3');
    if (formContainer && activeStepEl) formContainer.style.minHeight = `${activeStepEl.scrollHeight}px`;
    try {
        if (!this.geminiClient.isInitialized) {
            throw new Error("AI strategist is not configured. Please check API key.");
        }
        const industry = document.getElementById('businessIndustry').value;
        const size = document.getElementById('businessSize').value;
        const challenges = document.getElementById('businessChallenges').value;
        const goals = Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(cb => cb.value).join(', ');
        const recommendations = await this.geminiClient.getStrategicRecommendations(industry, size, challenges, goals);
        loadingEl.style.display = 'none';
        this.displayAIRecommendations(recommendations);
        resultsEl.style.display = 'block';
        this.speak(translationService.getTranslation('aiStrategistResults'));
    } catch (error) {
        console.error("AI Analysis failed:", error);
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = `<p class="form-message error show">${error.message || 'An unknown error occurred.'}</p>`;
        this.speak(error.message || translationService.getTranslation('aiAnalysisFailed'));
    }
  }

  displayAIRecommendations(data) {
    const resultsContainer = document.getElementById('strategistResults');
    if (!resultsContainer || !data) return;
    let html = `<div class="results-header">
                    <h3>${data.title || 'Your Strategic Constellation'}</h3>
                    <p>${data.summary || 'Here are the top services we recommend.'}</p>
                </div>
                <div class="recommendation-grid">`;
    if (!data.recommendations || data.recommendations.length === 0) {
        html += `<p class="form-message info show">No specific recommendations generated. Please try again or contact us.</p>`;
    } else {
        data.recommendations.forEach(rec => {
            html += `
                <div class="recommendation-card">
                    <div class="rec-header">
                        <div class="rec-icon">${rec.icon}</div>
                        <h4 class="rec-title">${rec.title}</h4>
                    </div>
                    <div class="rec-section">
                        <h5 class="rec-section-title">Why It's a Match</h5>
                        <p>${rec.match_reason}</p>
                    </div>
                    <div class="rec-section">
                        <h5 class="rec-section-title">Expected Benefits</h5>
                        <ul>${rec.benefits.map(b => `<li>${b}</li>`).join('')}</ul>
                    </div>
                    <div class="rec-section">
                        <h5 class="rec-section-title">Estimated Timeline</h5>
                        <p>${rec.timeline}</p>
                    </div>
                    <div class="rec-section">
                        <h5 class="rec-section-title">Next Steps</h5>
                        <p>Let's discuss how to tailor this strategy for you.</p>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>
             <div class="results-actions">
                <button type="button" class="cta-btn" id="strategistContactBtn">Schedule Consultation</button>
                <button type="button" class="secondary-btn" id="strategistPrintBtn">Print Recommendations</button>
             </div>`;
    resultsContainer.innerHTML = html;
    document.getElementById('strategistContactBtn').addEventListener('click', () => {
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('strategistPrintBtn').addEventListener('click', () => window.print());
    const formContainer = document.querySelector('.strategist-form-container');
    const resultsStepEl = document.getElementById('strategistStep3');
    if (formContainer && resultsStepEl) {
        setTimeout(() => formContainer.style.minHeight = `${resultsStepEl.scrollHeight}px`, 50);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on the main page before initializing the full experience
  if (document.querySelector('#hero')) {
    console.log('DOM loaded, initializing Final Enhanced Lunai Experience with AI Strategist');
    new EnhancedLunaiExperience();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const ctaBtn = document.getElementById('ctaBtn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      const servicesSection = document.getElementById('services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
      }
    });
  }
  window.addEventListener('scroll', () => {
    const scrollPercent = window.pageYOffset / (document.body.scrollHeight - window.innerHeight);
    const hue = Math.floor(scrollPercent * 60);
    document.documentElement.style.setProperty('--dynamic-hue', hue);
  });
});

if ('performance' in window) {
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    if (loadTime > 3000) document.body.classList.add('slow-device');
  });
}

window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('audio')) {
    console.log('Audio functionality may be limited due to browser restrictions');
  }
});

const voiceReactiveStyles = document.createElement('style');
voiceReactiveStyles.textContent = `
  @keyframes voiceReactiveGlow {
    0%, 100% { box-shadow: 0 0 20px var(--speaking-pulse); transform: scale(1); }
    50% { box-shadow: 0 0 40px var(--speaking-pulse), 0 0 60px var(--speaking-pulse); transform: scale(1.05); }
  }
  .feature-card.speaking, .service-card.speaking { animation: voiceReactiveGlow 2s ease-in-out infinite; }
  .mobile-optimized .starfield::before, .mobile-optimized .starfield::after { animation-duration: 60s; }
  .slow-device * { animation-duration: 2s !important; transition-duration: 0.5s !important; }
  body::after { left: var(--mouse-x, 0); top: var(--mouse-y, 0); }
  .device-mobile .particles-container { opacity: 0.5; }
  .device-mobile .starfield::before, .device-mobile .starfield::after { animation-duration: 180s; }
  .device-tablet .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .device-desktop .services-grid { grid-template-columns: repeat(3, 1fr); }
  select#contactInterest { pointer-events: auto !important; z-index: 1000 !important; position: relative !important; cursor: pointer !important; }
  .form-group { position: relative; z-index: 100; }
  .form-group:focus-within { z-index: 1001; }
`;
document.head.appendChild(voiceReactiveStyles);
