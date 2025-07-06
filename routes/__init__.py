import logging
import sys

# Configure logging for the routes module
def setup_logging() -> logging.Logger:
    """
    Setup logging configuration for the routes module.
    
    Creates and configures a logger instance for the routes module with:
    - Debug level logging
    - Console output handler
    - Formatted log messages with timestamp, logger name, level, and message
    
    Returns:
        logging.Logger: Configured logger instance for the routes module
        
    Note:
        This function ensures only one handler is created per logger instance
        to prevent duplicate log messages.
    """
    logger = logging.getLogger('routes')
    logger.setLevel(logging.DEBUG)
    
    # Create console handler if it doesn't exist
    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(console_handler)
    
    return logger

# Initialize logger
logger = setup_logging() 