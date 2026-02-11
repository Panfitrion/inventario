// Versión LocalStorage para pruebas sin Supabase

const LOCAL_STORAGE_KEY = 'inventario_vivo';

// Datos de prueba iniciales
const DUMMY_DATA = [
    { id: 1, nombre: 'Baguette', cantidad: 20 },
    { id: 2, nombre: 'Croissant', cantidad: 15 },
    { id: 3, nombre: 'Pan de Muerto', cantidad: 50 },
    { id: 4, nombre: 'Concha Vainilla', cantidad: 12 },
    { id: 5, nombre: 'Concha Chocolate', cantidad: 10 },
    { id: 6, nombre: 'Dona Glaseada', cantidad: 8 },
    { id: 7, nombre: 'Dona Chocolate', cantidad: 5 },
    { id: 8, nombre: 'Muffin Arándano', cantidad: 20 },
];

export async function fetchInventory() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
        // Inicializar si está vacío
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DUMMY_DATA));
        return DUMMY_DATA;
    }
    return JSON.parse(raw);
}

export async function updateQuantity(id, change, specificValue = null) {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let inventory = raw ? JSON.parse(raw) : DUMMY_DATA;

    const itemIndex = inventory.findIndex(i => i.id === id);
    if (itemIndex === -1) return { error: 'Item not found' };

    const item = inventory[itemIndex];
    const oldQty = item.cantidad;

    let newQty;
    if (specificValue !== null) {
        newQty = specificValue;
    } else {
        newQty = Math.max(0, oldQty + change);
    }

    item.cantidad = newQty;
    inventory[itemIndex] = item;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inventory));

    return { error: null, newQuantity: newQty };
}

export async function addProduct(name) {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let inventory = raw ? JSON.parse(raw) : DUMMY_DATA;

    // Generar ID simple
    const newId = Date.now();
    const newItem = { id: newId, nombre: name, cantidad: 0 };

    inventory.push(newItem);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inventory));

    return newItem;
}

// Suscripción usando evento 'storage' del navegador
export function subscribeToInventory(onUpdate) {
    window.addEventListener('storage', (event) => {
        if (event.key === LOCAL_STORAGE_KEY) {
            const oldData = JSON.parse(event.oldValue || '[]');
            const newData = JSON.parse(event.newValue || '[]');

            // Detectar cambios comparando arrays
            newData.forEach(newItem => {
                const oldItem = oldData.find(o => o.id === newItem.id);
                if (!oldItem || oldItem.cantidad !== newItem.cantidad) {
                    onUpdate({
                        eventType: 'UPDATE',
                        new: newItem,
                        old: oldItem || {}
                    });
                }
            });

            // Detectar nuevos (INSERT)
            if (newData.length > oldData.length) {
                newData.forEach(newItem => {
                    const oldItem = oldData.find(o => o.id === newItem.id);
                    if (!oldItem) {
                        onUpdate({
                            eventType: 'INSERT',
                            new: newItem
                        });
                    }
                });
            }
        }
    });
}
