.PHONY: build start stop restart logs clean help

GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m

help:
	@echo ""
	@echo "  $(YELLOW)make build$(NC)    : Build Docker images"
	@echo "  $(YELLOW)make start$(NC)    : Start all services"
	@echo "  $(YELLOW)make stop$(NC)     : Stop all services"
	@echo "  $(YELLOW)make restart$(NC)  : Restart all services"
	@echo "  $(YELLOW)make logs$(NC)     : View logs"
	@echo "  $(YELLOW)make clean$(NC)    : Remove everything"
	@echo ""

build:
	@echo "Building images."
	@docker-compose build
	@echo "$(GREEN)Build complete.$(NC)"

start:
	@echo "Starting services."
	@docker-compose up -d
	@echo ""
	@echo "$(YELLOW)http://localhost:5173$(NC)"

stop:
	@echo "Stopping services."
	@docker-compose down

restart:
	@echo "Restarting services."
	@docker-compose restart

logs:
	@docker-compose logs -f

clean:
	@echo "$(RED)Removing all containers and volumes.$(NC)"
	@docker-compose down -v
	@docker system prune -f
	@echo "$(GREEN)Cleanup complete.$(NC)"

.DEFAULT_GOAL := help