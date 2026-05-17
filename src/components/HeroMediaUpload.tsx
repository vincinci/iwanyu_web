import { useState } from 'react';
import { Upload, Trash2, X, AlertCircle, CheckCircle2, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadMediaToCloudinary } from '@/lib/cloudinary';
import { getSupabaseClient } from '@/lib/supabaseClient';

export type HeroMediaItem = {
    url: string;
    type: 'image' | 'video';
};

interface HeroMediaUploadProps {
    items: HeroMediaItem[];
    onItemsChange: (items: HeroMediaItem[]) => void;
    accessToken?: string;
    onSave?: () => Promise<void>;
}

export const HeroMediaUpload = ({
    items,
    onItemsChange,
    accessToken,
    onSave,
}: HeroMediaUploadProps) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files);
        void handleFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.currentTarget.files || []);
        void handleFiles(files);
    };

    const handleFiles = async (files: File[]) => {
        if (!accessToken) {
            toast({
                title: 'Error',
                description: 'No authentication token available',
                variant: 'destructive',
            });
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const uploadedItems: HeroMediaItem[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Validate file type
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');

                if (!isImage && !isVideo) {
                    toast({
                        title: 'Invalid file',
                        description: `${file.name} is not an image or video`,
                        variant: 'destructive',
                    });
                    continue;
                }

                // Validate file size (max 50MB for videos, 10MB for images)
                const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    toast({
                        title: 'File too large',
                        description: `${file.name} exceeds ${isVideo ? '50MB' : '10MB'} limit`,
                        variant: 'destructive',
                    });
                    continue;
                }

                try {
                    const result = await uploadMediaToCloudinary(file, {
                        kind: isVideo ? 'video' : 'image',
                        folder: 'hero',
                        accessToken,
                        onProgress: (progress) => {
                            const totalProgress = ((i + progress / 100) / files.length) * 100;
                            setUploadProgress(Math.round(totalProgress));
                        },
                    });

                    uploadedItems.push({
                        url: result.url,
                        type: isVideo ? 'video' : 'image',
                    });
                } catch (fileError) {
                    console.error(`Failed to upload ${file.name}:`, fileError);
                    toast({
                        title: `Upload failed: ${file.name}`,
                        description:
                            fileError instanceof Error ? fileError.message : 'Network error - check your connection',
                        variant: 'destructive',
                    });
                }
            }

            if (uploadedItems.length > 0) {
                onItemsChange([...items, ...uploadedItems]);
                toast({
                    title: 'Upload complete',
                    description: `${uploadedItems.length} item(s) uploaded. Click "Save Changes" to apply.`,
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Network error - please try again',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onItemsChange(newItems);
        setDeleteConfirm(null);
        toast({
            title: 'Item removed',
            description: 'Media item has been removed from the list.',
        });
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onItemsChange(newItems);
    };

    const handleSave = async () => {
        if (!onSave) return;

        setSaving(true);
        try {
            await onSave();
            toast({
                title: 'Changes saved',
                description: 'Hero media has been updated successfully.',
            });
        } catch (error) {
            console.error('Save error:', error);
            toast({
                title: 'Save failed',
                description: error instanceof Error ? error.message : 'Failed to save changes',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed transition-colors p-8 text-center ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                } ${uploading ? 'opacity-50' : ''}`}
            >
                <input
                    type="file"
                    id="hero-media-input"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading}
                />

                <label htmlFor="hero-media-input" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                <p className="text-sm font-medium text-gray-700">
                                    Uploading... {uploadProgress}%
                                </p>
                                <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        Drag and drop or click to upload
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Images up to 10MB, videos up to 50MB
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </label>
            </div>

            {/* Media Items List */}
            {items.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Media Items ({items.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item, index) => (
                            <div
                                key={`${item.url}-${index}`}
                                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
                            >
                                {/* Media Preview */}
                                <div className="aspect-video w-full bg-gray-800 relative">
                                    {item.type === 'video' ? (
                                        <>
                                            <video
                                                src={item.url}
                                                className="w-full h-full object-cover"
                                                controls
                                            />
                                            <div className="absolute top-2 left-2 bg-black/70 text-white rounded px-2 py-1 flex items-center gap-1">
                                                <Video className="h-4 w-4" />
                                                <span className="text-xs font-medium">Video</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <img
                                                src={item.url}
                                                alt={`Hero media ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 left-2 bg-black/70 text-white rounded px-2 py-1 flex items-center gap-1">
                                                <ImageIcon className="h-4 w-4" />
                                                <span className="text-xs font-medium">Image</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Action Buttons Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={index === 0}
                                            onClick={() => handleMove(index, 'up')}
                                            className="text-xs"
                                        >
                                            ↑
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={index === items.length - 1}
                                            onClick={() => handleMove(index, 'down')}
                                            className="text-xs"
                                        >
                                            ↓
                                        </Button>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setDeleteConfirm(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Delete Confirmation */}
                                {deleteConfirm === index && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 p-2 z-50">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(index)}
                                        >
                                            Delete
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setDeleteConfirm(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}

                                {/* Index Badge */}
                                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No media uploaded yet</p>
                    <p className="text-xs text-gray-500 mt-1">Upload images or videos to display in the hero section</p>
                </div>
            )}

            {/* Save Button */}
            {items.length > 0 && onSave && (
                <div className="flex gap-2 pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};
