document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener tenantId de la URL (ej: ?tenantId=GUID-DEL-GYM)
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenantId');

    const headerSection = document.getElementById('header-section');
    const plansContainer = document.getElementById('plans-container');
    const gymName = document.getElementById('gym-name');
    const gymStatus = document.getElementById('gym-status');

    if (!tenantId) {
        gymName.textContent = "Error de Acceso";
        gymStatus.textContent = "No se especificó un ID de gimnasio.";
        plansContainer.innerHTML = '<p style="color:red">Por favor inicia sesión desde Gymvo.</p>';
        return;
    }

    try {
        // 2. Consultar a nuestra API (Backend Node)
        const response = await fetch(`/api/checkout-info/${tenantId}`);
        
        if (!response.ok) throw new Error('Gym no encontrado');

        const data = await response.json();
        const { tenant, plans } = data;

        // 3. Renderizar Datos del Gym
        gymName.textContent = tenant.Name;
        gymStatus.textContent = tenant.IsActive ? "Cuenta Activa" : "Suscripción Vencida";
        gymStatus.style.color = tenant.IsActive ? "var(--success)" : "var(--secondary)";

        // 4. Renderizar Planes
        plansContainer.innerHTML = ''; // Limpiar spinner

        plans.forEach(plan => {
            const isFeatured = plan.Name.includes('Premium');
            const card = document.createElement('div');
            card.className = `plan-card ${isFeatured ? 'featured' : ''}`;

            card.innerHTML = `
                ${isFeatured ? '<div class="plan-badge">MÁS POPULAR</div>' : ''}
                <h3>${plan.Name}</h3>
                <div class="price">
                    <span class="currency">$</span>${plan.Price.toLocaleString()}
                </div>
                <p style="color: #a1a1aa">${plan.Description || 'Acceso mensual completo'}</p>
                
                <ul class="features">
                    <li>Acceso al sistema Gymvo</li>
                    <li>Soporte Técnico 24/7</li>
                    <li>Backups Automáticos</li>
                    ${isFeatured ? '<li><b>App Personalizada</b></li>' : ''}
                </ul>

                <button class="btn-pay" onclick="initPayment('${tenantId}', ${plan.EnumId}, ${plan.Price}, '${plan.Name}')">
                    Elegir Plan
                </button>
            `;
            plansContainer.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        gymName.textContent = "Gimnasio no encontrado";
        plansContainer.innerHTML = '<p>Verifica que el enlace sea correcto.</p>';
    }
});

// Función Global para iniciar pago
window.initPayment = async (tenantId, planEnumId, price, title) => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = "Procesando...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, planEnumId, price, title })
        });

        const data = await response.json();

        if (data.init_point) {
            // Redirigir a Mercado Pago
            window.location.href = data.init_point;
        } else {
            alert("Error al generar el pago");
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error pago:", error);
        alert("Hubo un error de conexión");
        btn.textContent = originalText;
        btn.disabled = false;
    }
};