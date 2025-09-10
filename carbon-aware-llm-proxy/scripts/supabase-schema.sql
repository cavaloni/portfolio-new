-- Supabase Schema Migration Script
-- This script creates the database schema in Supabase to match the existing TypeORM entities
-- Run this script in the Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    name VARCHAR,
    role user_role DEFAULT 'user' NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    avatar_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR DEFAULT 'system' NOT NULL,
    language VARCHAR DEFAULT 'en' NOT NULL,
    carbon_aware BOOLEAN DEFAULT true NOT NULL,
    preferred_regions TEXT[] DEFAULT '{}' NOT NULL,
    max_carbon_threshold DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create model_info table
CREATE TABLE IF NOT EXISTS model_info (
    id VARCHAR PRIMARY KEY,
    provider_model_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    description TEXT,
    context_window INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    training_data VARCHAR NOT NULL,
    knowledge_cutoff VARCHAR NOT NULL,
    architecture VARCHAR NOT NULL,
    parameters INTEGER NOT NULL,
    flops_per_token DECIMAL(15,2) NOT NULL,
    tokens_per_second DECIMAL(10,2),
    hardware VARCHAR NOT NULL,
    region VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    published_date TIMESTAMP WITH TIME ZONE,
    is_recommended BOOLEAN DEFAULT false NOT NULL,
    is_carbon_aware BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status conversation_status DEFAULT 'active' NOT NULL,
    metadata JSONB,
    model_id VARCHAR REFERENCES model_info(id),
    temperature DOUBLE PRECISION,
    max_tokens INTEGER,
    carbon_aware BOOLEAN DEFAULT true NOT NULL,
    message_count INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    total_emissions DOUBLE PRECISION DEFAULT 0 NOT NULL,
    total_energy DOUBLE PRECISION DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    model_id VARCHAR REFERENCES model_info(id),
    tokens INTEGER,
    is_streaming BOOLEAN DEFAULT false NOT NULL,
    is_complete BOOLEAN DEFAULT false NOT NULL,
    metadata JSONB,
    parent_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create carbon_footprints table
CREATE TABLE IF NOT EXISTS carbon_footprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID UNIQUE NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    emissions DECIMAL(10,6) NOT NULL,
    energy DECIMAL(10,6) NOT NULL,
    intensity DECIMAL(10,2),
    region VARCHAR,
    model_name VARCHAR,
    provider VARCHAR,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create model_deployments table
CREATE TABLE IF NOT EXISTS model_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR NOT NULL REFERENCES model_info(id),
    app_name VARCHAR UNIQUE NOT NULL,
    function_name VARCHAR NOT NULL,
    region VARCHAR,
    gpu_class VARCHAR NOT NULL,
    always_warm BOOLEAN DEFAULT false NOT NULL,
    warm_depth VARCHAR DEFAULT 'light' NOT NULL,
    scaledown_window_sec INTEGER DEFAULT 180 NOT NULL,
    status VARCHAR DEFAULT 'pending' NOT NULL,
    ingress_url VARCHAR,
    preference INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_carbon_footprints_message_id ON carbon_footprints(message_id);
CREATE INDEX IF NOT EXISTS idx_model_info_provider ON model_info(provider);
CREATE INDEX IF NOT EXISTS idx_model_info_active ON model_info(is_active);
CREATE INDEX IF NOT EXISTS idx_model_deployments_model_id ON model_deployments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_deployments_region ON model_deployments(region);
CREATE INDEX IF NOT EXISTS idx_model_deployments_status ON model_deployments(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_info_updated_at BEFORE UPDATE ON model_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_deployments_updated_at BEFORE UPDATE ON model_deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_footprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - can be customized based on requirements)
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own conversations" ON conversations FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view messages in own conversations" ON messages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id::text = auth.uid()::text
    )
);

CREATE POLICY "Users can view carbon footprints for own messages" ON carbon_footprints FOR ALL USING (
    EXISTS (
        SELECT 1 FROM messages 
        JOIN conversations ON conversations.id = messages.conversation_id
        WHERE messages.id = carbon_footprints.message_id 
        AND conversations.user_id::text = auth.uid()::text
    )
);

-- Model info and deployments are publicly readable (for model selection)
CREATE POLICY "Model info is publicly readable" ON model_info FOR SELECT USING (true);
CREATE POLICY "Model deployments are publicly readable" ON model_deployments FOR SELECT USING (true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
