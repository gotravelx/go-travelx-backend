import {
    createNewsletterTableIfNotExists,
    insertNewsletterSubscription,
    updateNewsletterSubscription,
  } from "../model/NewsLetterModel.js";
  import sendNewsletterEmail from "../services/sendNewsletterEmail.js";
  
  /* ==========================================================
     CREATE SUBSCRIPTION + AUTO EMAIL
  ========================================================== */
  export const createSubscriptionController = async (req, res) => {
    try {
 
      const { email, categories = [],env } = req.body;
  
      if (!email)
        return res.status(400).json({ success: false, message: "Email is required" });
    // Call table creation (will only log if exists)
      await createNewsletterTableIfNotExists();

  
      const result = await insertNewsletterSubscription(email, categories);
  
      if (!result.success)
        return res.status(400).json(result);
  
      // Auto-send welcome email
      await sendNewsletterEmail(email,env);
  
      return res.status(201).json({
        success: true,
        message: "Subscribed successfully. Email sent!",
        data: result.item
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
  
  /* ==========================================================
     UNSUBSCRIBE
  ========================================================== */
  export const unsubscribeController = async (req, res) => {
    try {
      const { email } = req.query;
  
      if (!email)
        return res.status(400).json({ success: false, message: "Email is required" });
  
      const result = await updateNewsletterSubscription(email, {
        subscribed: false,
      });
  
      if (!result.success)
        return res.status(404).json(result);
  
      return res.json({
          success: true,
          message: "You have been successfully unsubscribed!",
        });        
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
  