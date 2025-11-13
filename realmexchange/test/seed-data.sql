-- Insert a test user into the db with password testpassword
INSERT INTO user (id, username, password_hash, hwid) VALUES
('test-user-id', 'testuser', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05', 'test-hwid');

-- Insert a test account into the db and assign it to the test user
INSERT INTO account (owner_id, verified, guid, password, name, inventory_raw, seasonal) VALUES
('test-user-id', 1, 'asdf11@temptestingsite.us', 'asdf11@temptestingsite.us', 'Asdfjkwejp', 'Fire Spray Spell,Energy Staff', 1);