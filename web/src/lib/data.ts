import { useState, useEffect, useCallback } from 'react';
import { insforge } from '../lib/insforge';

interface Quote {
  id: string;
  text: string;
  is_active: boolean;
  created_at: string;
}

interface BlockedSite {
  id: string;
  domain: string;
  block_type: string;
  limit_seconds: number;
  is_active: boolean;
  created_at: string;
}

interface Image {
  id: string;
  url: string;
  storage_key: string | null;
  is_active: boolean;
  created_at: string;
}

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const { data } = await insforge.database.from('quotes').select('*').order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const addQuote = async (text: string) => {
    await insforge.database.from('quotes').insert([{ text, is_active: true }]);
    fetchQuotes();
  };

  const deleteQuote = async (id: string) => {
    await insforge.database.from('quotes').delete().eq('id', id);
    fetchQuotes();
  };

  const toggleQuote = async (id: string, isActive: boolean) => {
    await insforge.database.from('quotes').update({ is_active: isActive }).eq('id', id);
    fetchQuotes();
  };

  return { quotes, loading, addQuote, deleteQuote, toggleQuote, refresh: fetchQuotes };
}

export function useBlockedSites() {
  const [sites, setSites] = useState<BlockedSite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    const { data } = await insforge.database.from('blocked_sites').select('*').order('created_at', { ascending: false });
    setSites(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const addSite = async (domain: string, blockType: string = 'full', limitSeconds: number = 30) => {
    await insforge.database.from('blocked_sites').insert([{ 
      domain: domain.toLowerCase().replace(/^\.+/, '').replace(/\/+$/, ''),
      block_type: blockType,
      limit_seconds: limitSeconds,
      is_active: true 
    }]);
    fetchSites();
  };

  const deleteSite = async (id: string) => {
    await insforge.database.from('blocked_sites').delete().eq('id', id);
    fetchSites();
  };

  const toggleSite = async (id: string, isActive: boolean) => {
    await insforge.database.from('blocked_sites').update({ is_active: isActive }).eq('id', id);
    fetchSites();
  };

  const updateSite = async (id: string, updates: Partial<BlockedSite>) => {
    await insforge.database.from('blocked_sites').update(updates).eq('id', id);
    fetchSites();
  };

  return { sites, loading, addSite, deleteSite, toggleSite, updateSite, refresh: fetchSites };
}

export function useImages() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data } = await insforge.database.from('images').select('*').order('created_at', { ascending: false });
    setImages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const addImage = async (url: string, storageKey: string | null = null) => {
    await insforge.database.from('images').insert([{ url, storage_key: storageKey, is_active: true }]);
    fetchImages();
  };

  const deleteImage = async (id: string) => {
    await insforge.database.from('images').delete().eq('id', id);
    fetchImages();
  };

  const toggleImage = async (id: string, isActive: boolean) => {
    await insforge.database.from('images').update({ is_active: isActive }).eq('id', id);
    fetchImages();
  };

  return { images, loading, addImage, deleteImage, toggleImage, refresh: fetchImages };
}
