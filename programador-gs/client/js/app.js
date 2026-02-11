document.addEventListener('DOMContentLoaded', () => {
    
    // 1. INICIALIZACIÓN DE LENIS (Scroll Suave)
    // Al igual que en ZENDEV, esto mejora la experiencia de usuario (UX)
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smoothWheel: true,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. ANIMACIONES DE ENTRADA CON GSAP
    // Le damos vida al Hero de Programador GS
    gsap.to("#hero h1", {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power4.out",
        delay: 0.5
    });

    gsap.to("#hero p, .cta-group", {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
        delay: 0.8
    });

    // 3. CONEXIÓN CON LA API (Prueba de Salud)
    // Verificamos si el frontend puede hablar con el servidor Node.js
    const checkSystemStatus = async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.status === 'online') {
                console.log('✅ Sistema Programador GS: Operativo');
                console.log('🚀 DB Conectada:', data.db_connected);
            }
        } catch (error) {
            console.error('❌ Error de conexión con la API:', error);
        }
    };

    checkSystemStatus();
});