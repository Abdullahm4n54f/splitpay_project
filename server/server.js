const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const { Resolver } = require('dns').promises;
require('dotenv').config();

// import our routes
const userRoutes = require('./routes/userRoutes');

const app = express();

// Explicitly allow DELETE, PUT etc. so browser preflight requests succeed
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // handle all preflight requests
app.use(express.json());

// connect to MongoDB
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('your_username')) {
        try {
            // Sometimes local ISPs block the standard MongoDB SRV lookup.
            // To get around this, we manually resolve the connection using Google's DNS servers.
            const resolver = new Resolver();
            resolver.setServers(['8.8.8.8', '8.8.4.4']);

            // Extract hostname from the SRV URI
            const srvMatch = process.env.MONGO_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);
            if (srvMatch) {
                const [, dbUser, dbPass, srvHost] = srvMatch;
                console.log("🔍 Resolving SRV records via Google DNS...");

                const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${srvHost}`);
                let txtRecords = [];
                try { txtRecords = await resolver.resolveTxt(srvHost); } catch(e) {}

                // Build direct connection string from the SRV records
                const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');
                const txtOptions = txtRecords.flat().join('&');
                const directUri = `mongodb://${dbUser}:${dbPass}@${hosts}/splitpay?ssl=true&authSource=admin&${txtOptions}&retryWrites=true&w=majority`;

                await mongoose.connect(directUri, {
                    serverSelectionTimeoutMS: 10000
                });
                console.log("✅ Connected to MongoDB Atlas successfully!");
                return;
            }

            // If not SRV format, try direct connect
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 10000
            });
            console.log("✅ Connected to MongoDB Atlas successfully!");
            return;
        } catch (err) {
            console.log("⚠️  Atlas connection failed:", err.message);
            console.log("   Falling back to In-Memory MongoDB...");
        }
    }

    // Fallback to in-memory
    try {
        const mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log("✅ Connected to In-Memory MongoDB successfully!");
    } catch (err) {
        console.log("❌ Fatal: Could not connect to any database:", err.message);
    }
};

connectDB();

// use our routes
app.use('/api/users', userRoutes);
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// a simple test route to make sure our server is working
app.get('/', (req, res) => {
    res.send("SplitPay server is running!");
});

// start listening on the port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});