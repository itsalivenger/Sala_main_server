import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Faq from '../models/Faq';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const faqs = [
    {
        category: "getting_started",
        order: 1,
        question: {
            fr: "Comment créer un compte ?",
            ar: "[AR] كيف يمكنني إنشاء حساب؟",
            en: "How to create an account?"
        },
        answer: {
            fr: "Il n'y a pas de mot de passe à retenir. La création de compte se fait via votre numéro de téléphone : 1. Entrez votre numéro de téléphone. 2. Recevez un code de validation par SMS (OTP). 3. Saisissez le code pour vous connecter instantanément. 4. Complétez votre profil (Nom, Ville) lors de la première connexion.",
            ar: "[AR] لا توجد كلمة مرور للتذكر. يتم إنشاء الحساب عبر رقم هاتفك...",
            en: "There is no password to remember. Account creation is done via your phone number..."
        }
    },
    {
        category: "getting_started",
        order: 2,
        question: {
            fr: "Puis-je modifier mon numéro de téléphone ?",
            ar: "[AR] هل يمكنني تغيير رقم هاتفي؟",
            en: "Can I change my phone number?"
        },
        answer: {
            fr: "Oui. Allez dans Profil > Paramètres du compte > Modifier le numéro. Un code de validation sera envoyé à votre nouveau numéro pour confirmer le changement.",
            ar: "[AR] نعم. انتقل إلى الملف الشخصي > إعدادات الحساب > تغيير الرقم...",
            en: "Yes. Go to Profile > Account Settings > Change Number..."
        }
    },
    {
        category: "orders",
        order: 1,
        question: {
            fr: "Comment passer une commande ?",
            ar: "[AR] كيف أضع طلبية؟",
            en: "How to place an order?"
        },
        answer: {
            fr: "1. Parcourez le Catalogue ou recherchez un produit spécifique. 2. Ajoutez les articles souhaités au Panier. 3. Cliquez sur Commander pour accéder à l'écran de confirmation. 4. Définissez vos points de retrait et de livraison sur la carte.",
            ar: "[AR] 1. تصفح الكتالوج أو ابحث عن منتج معين...",
            en: "1. Browse the Catalog or search for a specific product..."
        }
    },
    {
        category: "orders",
        order: 2,
        question: {
            fr: "Existe-t-il un montant minimum ?",
            ar: "[AR] هل هناك حد أدنى للطلب؟",
            en: "Is there a minimum order amount?"
        },
        answer: {
            fr: "Certains services ou zones peuvent avoir un montant minimum de commande. Si c'est le cas, un message s'affichera dans le panier vous indiquant le montant manquant.",
            ar: "[AR] قد يكون لبعض الخدمات أو المناطق حد أدنى لمبلغ الطلب...",
            en: "Some services or areas may have a minimum order amount..."
        }
    },
    {
        category: "delivery",
        order: 1,
        question: {
            fr: "Comment sont calculés les frais de livraison ?",
            ar: "[AR] كيف يتم حساب رسوم التوصيل؟",
            en: "How are delivery fees calculated?"
        },
        answer: {
            fr: "Les frais sont calculés dynamiquement selon trois critères : 1. Le format de véhicule (Moto, Voiture, ou Camion). 2. La distance (Calculée au kilomètre). 3. Le poids (Un tarif au kilogramme peut s'appliquer).",
            ar: "[AR] يتم حساب الرسوم ديناميكيًا وفقًا لثلاثة معايير...",
            en: "Fees are calculated dynamically based on three criteria..."
        }
    },
    {
        category: "delivery",
        order: 2,
        question: {
            fr: "Quels sont les types de véhicules disponibles ?",
            ar: "[AR] ما هي أنواع المركبات المتوفرة؟",
            en: "What types of vehicles are available?"
        },
        answer: {
            fr: "Moto : Idéal pour les petits plis (< 10kg). Voiture / Fourgonnette : Pour les courses volumineuses (< 100kg). Camion : Pour les déménagements ou marchandises lourdes (> 100kg).",
            ar: "[AR] دراجة نارية: مثالية للطرود الصغيرة... سيارة: للطرود الكبيرة... شاحنة: للبضائع الثقيلة...",
            en: "Bike: Ideal for small packages... Car: For bulky items... Truck: For heavy goods..."
        }
    },
    {
        category: "interaction",
        order: 1,
        question: {
            fr: "Puis-je suivre ma commande en temps réel ?",
            ar: "[AR] هل يمكنني تتبع طلبي في الوقت الفعلي؟",
            en: "Can I track my order in real-time?"
        },
        answer: {
            fr: "Absolument. Une fois votre commande acceptée par un livreur, vous accédez à une carte interactive affichant la position actuelle du livreur, l'ETA et l'itinéraire.",
            ar: "[AR] بالتأكيد. بمجرد قبول طلبك من قبل عامل التوصيل...",
            en: "Absolutely. Once your order is accepted by a driver..."
        }
    },
    {
        category: "interaction",
        order: 2,
        question: {
            fr: "Comment contacter mon livreur ?",
            ar: "[AR] كيف أتواصل مع عامل التوصيل؟",
            en: "How to contact my driver?"
        },
        answer: {
            fr: "Depuis l'écran de suivi, vous disposez de deux boutons : Appel (pour appeler directement) et Chat (pour envoyer des messages instantanés).",
            ar: "[AR] من شاشة التتبع، لديك زرين: اتصال ودردشة...",
            en: "From the tracking screen, you have two buttons: Call and Chat..."
        }
    },
    {
        category: "billing",
        order: 1,
        question: {
            fr: "Où trouver mes anciennes commandes ?",
            ar: "[AR] أين أجد طلباتي القديمة؟",
            en: "Where to find my old orders?"
        },
        answer: {
            fr: "Toutes vos commandes sont archivées dans la section Historique. Vous pouvez y consulter les détails, les montants et le statut final (Livré, Annulé).",
            ar: "[AR] يتم أرشفة جميع طلباتك في قسم السجل...",
            en: "All your orders are archived in the History section..."
        }
    },
    {
        category: "billing",
        order: 2,
        question: {
            fr: "Comment télécharger une facture ?",
            ar: "[AR] كيف يتم تحميل الفاتورة؟",
            en: "How to download an invoice?"
        },
        answer: {
            fr: "Pour chaque commande livrée, vous pouvez cliquer sur 'Télécharger la facture' dans les détails de la commande. Un PDF officiel sera généré.",
            ar: "[AR] لكل طلب تم تسليمه، يمكنك النقر على 'تحميل الفاتورة'...",
            en: "For each delivered order, you can click on 'Download Invoice'..."
        }
    },
    {
        category: "support",
        order: 1,
        question: {
            fr: "Que faire en cas de problème ?",
            ar: "[AR] ماذا أفعل في حالة حدوث مشكلة؟",
            en: "What to do in case of a problem?"
        },
        answer: {
            fr: "1. Allez dans la section Support. 2. Cliquez sur 'Contacter le support'. 3. Sélectionnez le type de demande (Réclamation, Questions, ou Autres). 4. Expliquez votre problème.",
            ar: "[AR] 1. انتقل إلى قسم الدعم. 2. انقر على 'الاتصال بالدعم'...",
            en: "1. Go to the Support section. 2. Click 'Contact Support'..."
        }
    },
    {
        category: "settings",
        order: 1,
        question: {
            fr: "Comment changer le thème de l'application ?",
            ar: "[AR] كيف أغير سمة التطبيق؟",
            en: "How to change the app theme?"
        },
        answer: {
            fr: "SALA supporte le Mode Sombre. Allez dans votre profil et utilisez l'interrupteur de thème pour basculer entre le mode clair et sombre selon vos préférences.",
            ar: "[AR] يدعم SALA الوضع المظلم. انتقل إلى ملفك الشخصي...",
            en: "SALA supports Dark Mode. Go to your profile..."
        }
    }
];

const seedFaqs = async () => {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not defined');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, { dbName: process.env.DB_NAME || 'Sala' });
        console.log('✅ Connected to MongoDB');

        // Clear existing FAQs
        await Faq.deleteMany({});
        console.log('🗑️  Cleared existing FAQs');

        await Faq.insertMany(faqs);
        console.log(`✨ Successfully seeded ${faqs.length} FAQs!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding FAQs:', error);
        process.exit(1);
    }
};

seedFaqs();
