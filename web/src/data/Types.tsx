export type UserType = 'admin' | 'user' | 'guest';

export interface Guest {
    id: number;
    type: UserType;
    name: string;
    surname: string;
    role: string;
    organization: string;
    city: string;
    country: string;
    gender: string;
    email: string;
    image: string;
    invited: boolean;
    invited_date: string | null;
    accepted: boolean;
    accepted_date: string | null;
    attended: boolean;
    attended_date: string | null;
    invitation_code?: string;
}

export interface Sponsor {
    id: number;
    name: string;
    description: string;
    logo: string;
    url: string;
    contact: string;
    contact_email: string;
    contact_phone: string;
    country: string;
}