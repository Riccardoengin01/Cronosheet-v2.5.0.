import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { AlertTriangle } from 'lucide-react';

interface PayPalCheckoutProps {
    amount: string;
    planName: string;
    billingCycle: 'monthly' | 'annual';
    onSuccess: (details: any) => void;
    onError: (error: any) => void;
    onCancel: () => void;
}

const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({ amount, planName, billingCycle, onSuccess, onError, onCancel }) => {
    
    // IMPORTANTE: Qui devi inserire il tuo Client ID preso da developer.paypal.com
    // Se usi Vercel, lo metterai nelle variabili d'ambiente come VITE_PAYPAL_CLIENT_ID
    // Per ora, se sei in test, puoi incollare la stringa tra virgolette al posto di import.meta...
    const PAYPAL_CLIENT_ID = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || "test"; 

    return (
        <div className="w-full">
            {PAYPAL_CLIENT_ID === "test" && (
                <div className="mb-4 bg-amber-50 text-amber-800 p-3 rounded-lg text-xs flex items-center gap-2 border border-amber-200">
                    <AlertTriangle size={16} />
                    <span>Modalità Sandbox (Test). Nessun addebito reale.</span>
                </div>
            )}

            <PayPalScriptProvider options={{ 
                clientId: PAYPAL_CLIENT_ID,
                currency: "EUR",
                intent: "capture"
            }}>
                <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-auto relative z-50 border border-gray-100">
                    
                    {/* Header Riepilogo */}
                    <div className="text-center mb-8">
                        <div className="inline-block bg-indigo-50 p-3 rounded-full mb-3">
                            <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Cassa Veloce</h3>
                        <p className="text-gray-400 text-sm mt-1">Completa il tuo abbonamento</p>
                    </div>

                    {/* Dettagli Ordine */}
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Piano</span>
                            <span className="font-bold text-gray-800">{planName}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Fatturazione</span>
                            <span className="text-sm font-medium text-gray-800 capitalize">{billingCycle === 'annual' ? 'Annuale' : 'Mensile'}</span>
                        </div>
                        <div className="border-t border-gray-200 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-800">Totale</span>
                            <span className="text-2xl font-bold text-indigo-600">€{amount}</span>
                        </div>
                    </div>

                    {/* Pulsanti PayPal */}
                    <div className="relative z-0">
                        <PayPalButtons 
                            style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                            createOrder={(data, actions) => {
                                return actions.order.create({
                                    intent: "CAPTURE",
                                    purchase_units: [
                                        {
                                            description: `Cronosheet ${planName} - ${billingCycle}`,
                                            amount: {
                                                currency_code: "EUR",
                                                value: amount, 
                                            },
                                        },
                                    ],
                                });
                            }}
                            onApprove={async (data, actions) => {
                                if (actions.order) {
                                    const details = await actions.order.capture();
                                    onSuccess(details);
                                }
                            }}
                            onError={(err) => {
                                console.error("PayPal Error:", err);
                                onError(err);
                            }}
                        />
                    </div>

                    <button 
                        onClick={onCancel}
                        className="mt-6 w-full text-center text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                    >
                        Annulla transazione
                    </button>
                    
                    <div className="mt-4 flex justify-center items-center gap-2 opacity-50 grayscale">
                         <span className="text-[10px] text-gray-400">Powered by</span>
                         <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" alt="PayPal" className="h-4" />
                    </div>
                </div>
            </PayPalScriptProvider>
        </div>
    );
};

export default PayPalCheckout;