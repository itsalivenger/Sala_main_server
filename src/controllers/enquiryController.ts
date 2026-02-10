import Enquiry from '../models/Enquiry';

// Public: Submit enquiry
export const submitEnquiry = async (req: any, res: any) => {
    try {
        const { name, email, question } = req.body;

        if (!name || !email || !question) {
            return res.status(400).json({ success: false, message: "Tous les champs sont obligatoires." });
        }

        const enquiry = new Enquiry({ name, email, question });
        await enquiry.save();

        res.json({ success: true, message: "Votre question a été envoyée." });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all enquiries
export const getEnquiries = async (_req: any, res: any) => {
    try {
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        res.json({ success: true, enquiries });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update enquiry status
export const updateEnquiryStatus = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const enquiry = await Enquiry.findByIdAndUpdate(id, { status }, { new: true });
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Demande non trouvée" });
        }

        res.json({ success: true, enquiry });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Delete enquiry
export const deleteEnquiry = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const enquiry = await Enquiry.findByIdAndDelete(id);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Demande non trouvée" });
        }
        res.json({ success: true, message: "Demande supprimée" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
