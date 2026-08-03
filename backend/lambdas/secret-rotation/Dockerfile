# Dockerfile for rotation Lambda (Python 3.12)
# Build context: backend/ directory
FROM public.ecr.aws/lambda/python:3.12

# Install dependencies
COPY lambdas/secret-rotation/requirements.txt  .
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY lambdas/secret-rotation/lambda_function.py ${LAMBDA_TASK_ROOT}

# Set the handler
CMD ["lambda_function.lambda_handler"]