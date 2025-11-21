-- DELETE ALL EXISTING DATA
DELETE FROM account;
DELETE FROM user;

-- Insert a test user into the db with password testpassword
INSERT INTO user (id, username, email, password_hash, email_verified, email_notifications, hwid) VALUES
('test-user-id', 'testuser', 'test@example.com', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05', 1, 1, 'test-hwid');

-- Insert a test user into the db with password testpassword
INSERT INTO user (id, username, email, password_hash, email_verified, email_notifications, hwid) VALUES
('test-user-id2', 'testuser2', 'test2@example.com', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05', 1, 1, 'test-hwid');