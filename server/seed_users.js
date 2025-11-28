const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in server/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const createUsers = async () => {
    const users = [
        { email: 'admin@example.com', password: 'password123', role: 'admin' },
        { email: 'student@example.com', password: 'password123', role: 'student' }
    ];

    for (const user of users) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true
        });

        if (error) {
            console.error(`Error creating ${user.email}:`, error.message);
        } else {
            console.log(`Created user: ${user.email}`);
            // In a real app, we would add them to a 'users' table with their role
            // For now, we'll just log it.
        }
    }
};

createUsers();
