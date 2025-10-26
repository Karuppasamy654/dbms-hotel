-- Add password reset and email verification fields to user table
-- Run this script to update existing database

-- Add password reset fields
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expire TIMESTAMP;

-- Add email verification fields
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expire TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Add hotel_id field for managers
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES hotel(hotel_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_password_reset_token ON "user"(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_user_email_verification_token ON "user"(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_user_hotel_id ON "user"(hotel_id);

-- Update existing users to have verified email (for development)
UPDATE "user" SET is_email_verified = TRUE WHERE is_email_verified IS NULL;
