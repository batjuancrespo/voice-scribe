-- Enable RLS (Row Level Security) for security
-- Create PROFILES table (Linked to Auth Users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(email) >= 3)
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Create VOCABULARY table
create table vocabulary (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  original text not null,
  replacement text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table vocabulary enable row level security;

create policy "Users can view own vocabulary" on vocabulary
  for select using (auth.uid() = user_id);

create policy "Users can insert own vocabulary" on vocabulary
  for insert with check (auth.uid() = user_id);

create policy "Users can update own vocabulary" on vocabulary
  for update using (auth.uid() = user_id);

create policy "Users can delete own vocabulary" on vocabulary
  for delete using (auth.uid() = user_id);


-- Create TEMPLATES table
create table templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table templates enable row level security;

create policy "Users can view own templates" on templates
  for select using (auth.uid() = user_id);

create policy "Users can insert own templates" on templates
  for insert with check (auth.uid() = user_id);

create policy "Users can update own templates" on templates
  for update using (auth.uid() = user_id);

create policy "Users can delete own templates" on templates
  for delete using (auth.uid() = user_id);

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
