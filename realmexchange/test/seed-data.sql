-- DELETE ALL EXISTING DATA
DELETE FROM account;
DELETE FROM user;

-- Insert a test user into the db with password testpassword
INSERT INTO user (id, username, password_hash, hwid) VALUES
('test-user-id', 'testuser', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05', 'test-hwid');

-- Insert a test user into the db with password testpassword
INSERT INTO user (id, username, password_hash, hwid) VALUES
('test-user-id2', 'testuser2', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05', 'test-hwid');