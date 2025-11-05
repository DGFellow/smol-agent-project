# backend/src/routes/files.py
from flask import Blueprint, request, jsonify, send_file, g
from werkzeug.utils import secure_filename
from pathlib import Path
import os
import time
import mimetypes
from datetime import datetime

from src.middleware.auth import token_required
from src.database.conversation import Conversation

files_bp = Blueprint('files', __name__)

# Configuration
UPLOAD_FOLDER = Path('data/documents')
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB default (can be overridden)

# Ensure upload folder exists
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


def get_file_path(conversation_id: int, filename: str) -> Path:
    """Get organized file path by conversation"""
    conv_folder = UPLOAD_FOLDER / str(conversation_id)
    conv_folder.mkdir(parents=True, exist_ok=True)
    return conv_folder / filename


def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename with timestamp"""
    name, ext = os.path.splitext(secure_filename(original_filename))
    timestamp = int(time.time() * 1000)
    return f"{timestamp}_{name}{ext}"


@files_bp.route('/upload', methods=['POST'])
@token_required
def upload_file():
    """
    Upload a file with enhanced metadata tracking
    Supports ALL file types and sizes
    """
    user_id = request.user_id
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    conversation_id = request.form.get('conversation_id', type=int)

    if not file or file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Generate unique filename
        original_filename = file.filename
        unique_filename = generate_unique_filename(original_filename)
        
        # Determine storage path
        if conversation_id:
            # Verify conversation ownership
            conversation_model = Conversation(g.db)
            conv = conversation_model.get_by_id(conversation_id)
            if not conv or conv['user_id'] != user_id:
                return jsonify({"error": "Unauthorized"}), 403
            
            file_path = get_file_path(conversation_id, unique_filename)
        else:
            # Temporary upload (no conversation yet)
            temp_folder = UPLOAD_FOLDER / 'temp' / str(user_id)
            temp_folder.mkdir(parents=True, exist_ok=True)
            file_path = temp_folder / unique_filename

        # Save file
        file.save(file_path)
        
        # Get file metadata
        file_size = file_path.stat().st_size
        mime_type = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
        
        # Return enhanced metadata
        return jsonify({
            "success": True,
            "file": {
                "file_id": unique_filename,
                "filename": unique_filename,
                "original_name": original_filename,
                "size": file_size,
                "mime_type": mime_type,
                "conversation_id": conversation_id,
                "uploaded_at": datetime.now().isoformat(),
                "path": str(file_path)
            },
            "message": "File uploaded successfully"
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Upload failed",
            "details": str(e)
        }), 500


@files_bp.route('/<file_id>', methods=['GET'])
@token_required
def get_file_metadata(file_id: str):
    """Get file metadata"""
    user_id = request.user_id
    
    try:
        # Search in user's conversations
        for conv_folder in UPLOAD_FOLDER.iterdir():
            if conv_folder.is_dir() and conv_folder.name.isdigit():
                file_path = conv_folder / secure_filename(file_id)
                if file_path.exists():
                    # Verify ownership
                    conversation_id = int(conv_folder.name)
                    conversation_model = Conversation(g.db)
                    conv = conversation_model.get_by_id(conversation_id)
                    
                    if conv and conv['user_id'] == user_id:
                        file_size = file_path.stat().st_size
                        mime_type = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
                        
                        return jsonify({
                            "file_id": file_id,
                            "filename": file_id,
                            "size": file_size,
                            "mime_type": mime_type,
                            "conversation_id": conversation_id,
                            "path": str(file_path)
                        })
        
        return jsonify({"error": "File not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route('/<file_id>/download', methods=['GET'])
@token_required
def download_file(file_id: str):
    """Download a file"""
    user_id = request.user_id
    
    try:
        # Search in user's conversations
        for conv_folder in UPLOAD_FOLDER.iterdir():
            if conv_folder.is_dir() and conv_folder.name.isdigit():
                file_path = conv_folder / secure_filename(file_id)
                if file_path.exists():
                    # Verify ownership
                    conversation_id = int(conv_folder.name)
                    conversation_model = Conversation(g.db)
                    conv = conversation_model.get_by_id(conversation_id)
                    
                    if conv and conv['user_id'] == user_id:
                        return send_file(
                            file_path,
                            as_attachment=True,
                            download_name=file_id
                        )
        
        return jsonify({"error": "File not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route('/<file_id>', methods=['DELETE'])
@token_required
def delete_file(file_id: str):
    """Delete a file"""
    user_id = request.user_id
    
    try:
        # Search in user's conversations
        for conv_folder in UPLOAD_FOLDER.iterdir():
            if conv_folder.is_dir() and conv_folder.name.isdigit():
                file_path = conv_folder / secure_filename(file_id)
                if file_path.exists():
                    # Verify ownership
                    conversation_id = int(conv_folder.name)
                    conversation_model = Conversation(g.db)
                    conv = conversation_model.get_by_id(conversation_id)
                    
                    if conv and conv['user_id'] == user_id:
                        file_path.unlink()
                        return jsonify({
                            "success": True,
                            "file_id": file_id,
                            "message": "File deleted successfully"
                        })
        
        return jsonify({"error": "File not found or unauthorized"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500