/**
 * Ensures the image path points to the correct subdirectory if it's not already there.
 * This is used to maintain backward compatibility with images moved to partitioned folders.
 */
export const getImagePath = (path: string | null | undefined, folder: 'users' | 'sponsors' | 'company' | 'events') => {
    if (!path) return '';
    
    // If it's a full URL, return it as is
    if (path.startsWith('http')) return path;
    
    // If it starts with /uploads/ but doesn't have the folder name next, insert it
    if (path.startsWith('/uploads/') && !path.startsWith(`/uploads/${folder}/`)) {
        return path.replace('/uploads/', `/uploads/${folder}/`);
    }
    
    return path;
};
