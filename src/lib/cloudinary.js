import {v2 as cloudinary} from 'cloudinary'
import "dotenv/config"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbikek1i1',
    api_key: process.env.CLOUDINARY_API_KEY || '874394777511474',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Mzs_Fjpof61M_eQwb5qRKdsPXpw', // Fixed: was 'secret_key', should be 'api_secret'
})

export default cloudinary;

